/**
 * crypto.js — SecureChat Cryptographic Module
 * Uses libsodium-wrappers for all cryptographic operations.
 * NO custom cryptography. All primitives are from libsodium (NaCl).
 *
 * Primitives used:
 *  - X25519 (crypto_kx)  : Key exchange (shared secret)
 *  - Ed25519 (crypto_sign): Identity signing
 *  - ChaCha20-Poly1305   : Message encryption (crypto_secretbox)
 *  - BLAKE2b             : Hashing / key derivation
 *  - Argon2id            : Password-based key derivation (PIN)
 *  - randombytes         : Secure random generation
 */

'use strict';

const CryptoModule = (() => {
  let _sodium = null;

  /**
   * Initialize libsodium. Must be called before any other function.
   * @returns {Promise<void>}
   */
  async function init() {
    await sodium.ready;
    _sodium = sodium;
    console.log('[Crypto] libsodium ready. Version:', _sodium.sodium_version_string());
  }

  function _assertReady() {
    if (!_sodium) throw new Error('[Crypto] libsodium not initialized. Call CryptoModule.init() first.');
  }

  // ── Key Generation ────────────────────────────────────────

  /**
   * Generate an X25519 key pair for key exchange (Diffie-Hellman).
   * Used to establish shared secrets between users.
   */
  function generateKeyExchangeKeypair() {
    _assertReady();
    const kp = _sodium.crypto_kx_keypair();
    return {
      publicKey:  _sodium.to_base64(kp.publicKey),
      privateKey: _sodium.to_base64(kp.privateKey),
    };
  }

  /**
   * Generate an Ed25519 key pair for identity signing.
   * Used to verify the origin of messages and key exchanges.
   */
  function generateSigningKeypair() {
    _assertReady();
    const kp = _sodium.crypto_sign_keypair();
    return {
      publicKey:  _sodium.to_base64(kp.publicKey),
      privateKey: _sodium.to_base64(kp.privateKey),
    };
  }

  // ── Shared Secret (ECDH) ──────────────────────────────────

  /**
   * Client-side key exchange: compute shared secret.
   * Alice uses her private key + Bob's public key → shared secret.
   * Both sides must produce the same shared secret.
   *
   * @param {string} myPrivateKeyB64 - Our X25519 private key (base64)
   * @param {string} theirPublicKeyB64 - Their X25519 public key (base64)
   * @param {boolean} isInitiator - true if we initiated the conversation
   * @returns {{ rx: string, tx: string }} - Receive and transmit keys (base64)
   */
  function computeSharedSecret(myPrivateKeyB64, myPublicKeyB64, theirPublicKeyB64, isInitiator) {
    _assertReady();
    const myPriv  = _sodium.from_base64(myPrivateKeyB64);
    const myPub   = _sodium.from_base64(myPublicKeyB64);
    const theirPub = _sodium.from_base64(theirPublicKeyB64);

    let result;
    if (isInitiator) {
      result = _sodium.crypto_kx_client_session_keys(myPub, myPriv, theirPub);
    } else {
      result = _sodium.crypto_kx_server_session_keys(myPub, myPriv, theirPub);
    }
    return {
      rx: _sodium.to_base64(result.sharedRx), // key for receiving
      tx: _sodium.to_base64(result.sharedTx), // key for sending
    };
  }

  // ── Message Encryption ────────────────────────────────────

  /**
   * Encrypt a message with ChaCha20-Poly1305 (secretbox).
   * Produces authenticated ciphertext with a random nonce.
   *
   * @param {string} plaintext - UTF-8 message content
   * @param {string} keyB64 - 32-byte symmetric key (base64)
   * @returns {string} JSON string containing nonce + ciphertext (base64)
   */
  function encryptMessage(plaintext, keyB64) {
    _assertReady();
    const key   = _sodium.from_base64(keyB64);
    const nonce = _sodium.randombytes_buf(_sodium.crypto_secretbox_NONCEBYTES);
    const msg   = _sodium.from_string(plaintext);
    const cipher = _sodium.crypto_secretbox_easy(msg, nonce, key);

    return JSON.stringify({
      nonce: _sodium.to_base64(nonce),
      ciphertext: _sodium.to_base64(cipher),
    });
  }

  /**
   * Decrypt a message encrypted with encryptMessage().
   *
   * @param {string} encryptedJson - Output of encryptMessage()
   * @param {string} keyB64 - 32-byte symmetric key (base64)
   * @returns {string} Decrypted UTF-8 plaintext
   */
  function decryptMessage(encryptedJson, keyB64) {
    _assertReady();
    const { nonce: nonceB64, ciphertext: cipherB64 } = JSON.parse(encryptedJson);
    const key    = _sodium.from_base64(keyB64);
    const nonce  = _sodium.from_base64(nonceB64);
    const cipher = _sodium.from_base64(cipherB64);
    const plain  = _sodium.crypto_secretbox_open_easy(cipher, nonce, key);
    if (!plain) throw new Error('[Crypto] Decryption failed: authentication tag mismatch.');
    return _sodium.to_string(plain);
  }

  // ── Signing ───────────────────────────────────────────────

  /**
   * Sign data with Ed25519 identity key.
   * Used for signing contact requests and key exchange messages.
   *
   * @param {string} data - String to sign
   * @param {string} signingPrivateKeyB64 - Ed25519 private key (base64)
   * @returns {string} Signature (base64)
   */
  function sign(data, signingPrivateKeyB64) {
    _assertReady();
    const privKey = _sodium.from_base64(signingPrivateKeyB64);
    const msg = _sodium.from_string(data);
    const sig = _sodium.crypto_sign_detached(msg, privKey);
    return _sodium.to_base64(sig);
  }

  /**
   * Verify an Ed25519 signature.
   *
   * @param {string} data - Original string that was signed
   * @param {string} signatureB64 - Signature to verify (base64)
   * @param {string} signingPublicKeyB64 - Ed25519 public key (base64)
   * @returns {boolean}
   */
  function verify(data, signatureB64, signingPublicKeyB64) {
    _assertReady();
    try {
      const pubKey = _sodium.from_base64(signingPublicKeyB64);
      const sig    = _sodium.from_base64(signatureB64);
      const msg    = _sodium.from_string(data);
      return _sodium.crypto_sign_verify_detached(sig, msg, pubKey);
    } catch {
      return false;
    }
  }

  // ── Hashing / Identity ────────────────────────────────────

  /**
   * Derive a lookup hash from a phone number.
   * Uses BLAKE2b with a server-side pepper (simulated locally in MVP).
   * This is a one-way transformation: phone → lookup hash.
   * The original phone number is never transmitted to the server.
   *
   * @param {string} phoneNumber - E.164 format: +34612345678
   * @param {string} pepper - Server-known secret pepper (fetched from relay on login)
   * @returns {string} Lookup hash (base64)
   */
  function phoneToLookupHash(phoneNumber, pepper) {
    _assertReady();
    const key = _sodium.from_string(pepper.padEnd(32, '0').slice(0, 32));
    const msg = _sodium.from_string(phoneNumber.replace(/\s/g, ''));
    const hash = _sodium.crypto_generichash(32, msg, key); // BLAKE2b-256
    return _sodium.to_base64(hash);
  }

  /**
   * Compute a public fingerprint for displaying to users.
   * Allows users to verify each other's identity out-of-band.
   *
   * @param {string} publicKeyB64 - Ed25519 public key (base64)
   * @returns {string} Human-readable fingerprint (hex groups)
   */
  function computeFingerprint(publicKeyB64) {
    _assertReady();
    const pub = _sodium.from_base64(publicKeyB64);
    const hash = _sodium.crypto_generichash(20, pub);
    const hex = _sodium.to_hex(hash).toUpperCase();
    // Format as groups of 4: ABCD EFGH ...
    return hex.match(/.{1,4}/g).join(' ');
  }

  // ── PIN-based key derivation ──────────────────────────────

  /**
   * Derive an encryption key from a user PIN using Argon2id.
   * Used to encrypt private keys stored in localStorage.
   *
   * @param {string} pin - User's PIN/passphrase
   * @param {string|null} saltB64 - Existing salt (base64), or null to generate new
   * @returns {{ key: string, salt: string }} - Derived key and salt (base64)
   */
  function deriveKeyFromPin(pin, saltB64 = null) {
    _assertReady();
    const salt = saltB64
      ? _sodium.from_base64(saltB64)
      : _sodium.randombytes_buf(_sodium.crypto_pwhash_SALTBYTES);

    const key = _sodium.crypto_pwhash(
      32,
      _sodium.from_string(pin),
      salt,
      _sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      _sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      _sodium.crypto_pwhash_ALG_ARGON2ID13
    );
    return {
      key: _sodium.to_base64(key),
      salt: _sodium.to_base64(salt),
    };
  }

  // ── Secure Random ─────────────────────────────────────────

  /**
   * Generate a cryptographically secure random token (hex string).
   * Used for invitation tokens, message IDs, session IDs.
   *
   * @param {number} bytes - Number of random bytes (default 32)
   * @returns {string} Hex-encoded random token
   */
  function generateSecureToken(bytes = 32) {
    _assertReady();
    const buf = _sodium.randombytes_buf(bytes);
    return _sodium.to_hex(buf);
  }

  /**
   * Generate a random UUID v4-like identifier.
   * @returns {string} UUID string
   */
  function generateId() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }

  // ── Helpers ───────────────────────────────────────────────

  /**
   * Encrypt an object with a PIN-derived key.
   * Used to protect the identity bundle in localStorage.
   */
  function encryptWithPin(obj, pinKeyB64) {
    const json = JSON.stringify(obj);
    return encryptMessage(json, pinKeyB64);
  }

  /**
   * Decrypt an object encrypted with encryptWithPin().
   */
  function decryptWithPin(encrypted, pinKeyB64) {
    const json = decryptMessage(encrypted, pinKeyB64);
    return JSON.parse(json);
  }

  /**
   * Compare two Uint8Arrays in constant time (no timing side-channel).
   */
  function constantTimeEqual(a, b) {
    _assertReady();
    return _sodium.memcmp(a, b);
  }

  // ── Public API ────────────────────────────────────────────
  return {
    init,
    generateKeyExchangeKeypair,
    generateSigningKeypair,
    computeSharedSecret,
    encryptMessage,
    decryptMessage,
    sign,
    verify,
    phoneToLookupHash,
    computeFingerprint,
    deriveKeyFromPin,
    generateSecureToken,
    generateId,
    encryptWithPin,
    decryptWithPin,
    constantTimeEqual,
  };
})();
