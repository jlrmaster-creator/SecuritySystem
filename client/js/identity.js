/**
 * identity.js — SecureChat Identity Module
 *
 * Manages local user identity: key generation, phone hashing,
 * registration state, and PIN verification.
 *
 * The phone number NEVER leaves the device in plaintext.
 * Only the BLAKE2b HMAC (lookup hash) is transmitted to the relay.
 */

'use strict';

const IdentityModule = (() => {
  // Loaded identity in memory after unlock
  let _identity = null;

  // Server pepper fetched on session start (simulated in MVP)
  // In production: fetched from relay over TLS before any hash computation
  const MVP_PEPPER = 'securechat-pepper-v1-mvp';

  // ── State checks ─────────────────────────────────────────

  function isRegistered() {
    return StorageModule.hasIdentity();
  }

  function isUnlocked() {
    return _identity !== null;
  }

  function getIdentity() {
    return _identity;
  }

  function getUserId() {
    return _identity?.userId || null;
  }

  function getAlias() {
    return _identity?.alias || '';
  }

  function getPublicKey() {
    return _identity?.kxPublicKey || null;
  }

  function getSigningPublicKey() {
    return _identity?.sigPublicKey || null;
  }

  function getUserHash() {
    return _identity?.userHash || null;
  }

  // ── Registration ─────────────────────────────────────────

  /**
   * Create a new identity from a phone number and optional alias.
   * Generates fresh cryptographic keys, derives PIN key, and saves encrypted bundle.
   *
   * @param {string} phoneNumber - E.164 format: +34612345678
   * @param {string} alias - Optional display name
   * @param {string} pin - User PIN (4-8 digits or passphrase)
   * @returns {Object} The new identity bundle (for display)
   */
  async function createIdentity(phoneNumber, alias, pin) {
    // 1. Generate keys
    const kxKeyPair  = CryptoModule.generateKeyExchangeKeypair();  // X25519
    const sigKeyPair = CryptoModule.generateSigningKeypair();       // Ed25519

    // 2. Derive lookup hash from phone (never store phone plaintext on server)
    const userHash = CryptoModule.phoneToLookupHash(phoneNumber, MVP_PEPPER);

    // 3. Generate internal random UUID (not related to phone number)
    const userId = CryptoModule.generateId();

    // 4. Compute public key fingerprint for display
    const fingerprint = CryptoModule.computeFingerprint(sigKeyPair.publicKey);

    // 5. Device ID
    const deviceId = StorageModule.getOrCreateDeviceId();

    // 6. Build identity bundle
    const identityBundle = {
      userId,
      userHash,          // BLAKE2b(phone, pepper) — sent to relay
      alias: alias || `User-${userId.slice(0, 6)}`,
      phoneNumber,       // Stored LOCALLY only, encrypted with PIN
      fingerprint,
      deviceId,
      kxPublicKey:  kxKeyPair.publicKey,
      kxPrivateKey: kxKeyPair.privateKey,   // NEVER leaves device
      sigPublicKey: sigKeyPair.publicKey,
      sigPrivateKey: sigKeyPair.privateKey, // NEVER leaves device
      createdAt: Date.now(),
      version: 1,
    };

    // 7. Derive encryption key from PIN with Argon2id
    const { key: pinKey, salt } = CryptoModule.deriveKeyFromPin(pin);

    // 8. Save PIN salt separately (needed to re-derive key on next login)
    StorageModule.savePinSalt(salt);

    // 9. Encrypt and save identity bundle
    StorageModule.saveIdentity(identityBundle, pinKey);

    // 10. Keep in memory
    _identity = identityBundle;
    StorageModule.setSessionKey(pinKey);

    console.log('[Identity] New identity created. UserID:', userId);
    return identityBundle;
  }

  /**
   * Unlock the stored identity with the user's PIN.
   *
   * @param {string} pin
   * @returns {Object} Identity bundle
   */
  async function unlockWithPin(pin) {
    const salt = StorageModule.getPinSalt();
    if (!salt) throw new Error('[Identity] No PIN salt found. Has identity been created?');

    // Re-derive key from PIN
    const { key: pinKey } = CryptoModule.deriveKeyFromPin(pin, salt);

    // Try to decrypt identity
    const bundle = StorageModule.loadIdentity(pinKey);
    if (!bundle) throw new Error('[Identity] Identity not found.');

    _identity = bundle;
    StorageModule.setSessionKey(pinKey);

    console.log('[Identity] Identity unlocked. UserID:', bundle.userId);
    return bundle;
  }

  /**
   * Lock the identity (clear from memory). Called on background/lock.
   */
  function lock() {
    _identity = null;
    StorageModule.clearSessionKey();
    console.log('[Identity] Identity locked.');
  }

  // ── Peer identity ────────────────────────────────────────

  /**
   * Compute the lookup hash for a peer's phone number.
   * Used when initiating a contact request.
   *
   * @param {string} phoneNumber
   * @returns {string} lookup hash (base64)
   */
  function computePeerHash(phoneNumber) {
    return CryptoModule.phoneToLookupHash(phoneNumber, MVP_PEPPER);
  }

  /**
   * Build a contact request payload.
   * Contains our public keys, signed with our Ed25519 key.
   * This payload is sent (encrypted) to the relay for the peer.
   *
   * @param {string} peerKxPublicKeyB64 - Optional: peer's KX public key if known (for encryption)
   * @returns {Object} Contact request payload
   */
  function buildContactRequestPayload(peerKxPublicKeyB64 = null) {
    if (!_identity) throw new Error('[Identity] Not unlocked.');

    const payload = {
      fromUserId: _identity.userId,
      fromUserHash: _identity.userHash,
      fromAlias: _identity.alias,
      kxPublicKey: _identity.kxPublicKey,
      sigPublicKey: _identity.sigPublicKey,
      timestamp: Date.now(),
      nonce: CryptoModule.generateSecureToken(16),
    };

    // Sign the payload to prove authenticity
    const payloadStr = JSON.stringify(payload);
    const signature = CryptoModule.sign(payloadStr, _identity.sigPrivateKey);

    return { payload, signature };
  }

  /**
   * Accept a contact request: compute shared secret with the peer.
   *
   * @param {Object} peerPayload - Verified contact request payload
   * @returns {Object} Conversation entry with shared secret
   */
  function acceptContactRequest(peerPayload) {
    if (!_identity) throw new Error('[Identity] Not unlocked.');

    const { sharedRx, sharedTx } = _computeSharedSecretWithPeer(
      peerPayload.kxPublicKey,
      false // we are the responder
    );

    const convId = CryptoModule.generateId();
    return {
      id: convId,
      userId: peerPayload.fromUserId,
      userHash: peerPayload.fromUserHash,
      alias: peerPayload.fromAlias || peerPayload.fromUserId.slice(0, 8),
      kxPublicKey: peerPayload.kxPublicKey,
      sigPublicKey: peerPayload.sigPublicKey,
      // Use tx for sending, rx for receiving
      sharedKeyTx: sharedTx,
      sharedKeyRx: sharedRx,
      createdAt: Date.now(),
      ttlMs: null,
      unread: 0,
      lastMessage: '',
      lastTime: Date.now(),
    };
  }

  /**
   * After peer accepts our contact request, finalize the conversation.
   *
   * @param {string} peerKxPublicKeyB64
   * @param {Object} peerInfo
   * @returns {Object} Conversation entry
   */
  function finalizeContactRequest(peerKxPublicKeyB64, peerInfo) {
    if (!_identity) throw new Error('[Identity] Not unlocked.');

    const { sharedRx, sharedTx } = _computeSharedSecretWithPeer(
      peerKxPublicKeyB64,
      true // we initiated
    );

    const convId = CryptoModule.generateId();
    return {
      id: convId,
      userId: peerInfo.userId,
      userHash: peerInfo.userHash,
      alias: peerInfo.alias || peerInfo.userId.slice(0, 8),
      kxPublicKey: peerKxPublicKeyB64,
      sigPublicKey: peerInfo.sigPublicKey,
      sharedKeyTx: sharedTx,
      sharedKeyRx: sharedRx,
      createdAt: Date.now(),
      ttlMs: null,
      unread: 0,
      lastMessage: '',
      lastTime: Date.now(),
    };
  }

  function _computeSharedSecretWithPeer(peerKxPublicKeyB64, isInitiator) {
    const result = CryptoModule.computeSharedSecret(
      _identity.kxPrivateKey,
      _identity.kxPublicKey,
      peerKxPublicKeyB64,
      isInitiator
    );
    return { sharedRx: result.rx, sharedTx: result.tx };
  }

  // ── Public API ────────────────────────────────────────────
  return {
    isRegistered,
    isUnlocked,
    getIdentity,
    getUserId,
    getAlias,
    getPublicKey,
    getSigningPublicKey,
    getUserHash,
    createIdentity,
    unlockWithPin,
    lock,
    computePeerHash,
    buildContactRequestPayload,
    acceptContactRequest,
    finalizeContactRequest,
  };
})();
