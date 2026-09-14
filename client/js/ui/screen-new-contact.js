/**
 * screen-new-contact.js — New Conversation / Contact Request Screen
 */

'use strict';

const ScreenNewContact = (() => {
  function render() {
    return `
      <div class="screen" id="screenNewContact">
        <h2 style="font-size:1.3rem;font-weight:700;letter-spacing:-0.03em;margin-bottom:8px;">Nueva conversación</h2>
        <p style="color:var(--c-text-2);font-size:0.87rem;line-height:1.6;margin-bottom:24px;">
          Para iniciar una conversación, necesitas conocer el número de teléfono de la otra persona.
          Se enviará una <strong>solicitud de contacto cifrada</strong> que la otra persona debe aceptar.
        </p>

        <div style="display:flex;flex-direction:column;gap:16px;">
          <div class="new-contact-info">
            <strong>¿Cómo funciona?</strong>
            <ol style="margin-top:8px;padding-left:18px;line-height:2;">
              <li>Introduces el número de la otra persona</li>
              <li>El sistema genera una solicitud cifrada</li>
              <li>Esa persona recibe tu solicitud y la acepta o rechaza</li>
              <li>Solo tras aceptar, se establece el canal de comunicación</li>
            </ol>
          </div>

          <div class="input-group">
            <label class="input-label" for="newContactPrefix">Prefijo</label>
            <div class="phone-row">
              <select id="newContactPrefix" class="input-field phone-prefix" style="cursor:pointer;">
                <option value="+34">🇪🇸 +34</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+33">🇫🇷 +33</option>
                <option value="+49">🇩🇪 +49</option>
                <option value="+39">🇮🇹 +39</option>
                <option value="+55">🇧🇷 +55</option>
                <option value="+52">🇲🇽 +52</option>
                <option value="+54">🇦🇷 +54</option>
              </select>
              <input
                type="tel"
                id="newContactPhone"
                class="input-field phone-number"
                placeholder="612 345 678"
                autocomplete="off"
                inputmode="numeric"
                maxlength="15"
              />
            </div>
          </div>

          <div class="input-group">
            <label class="input-label" for="newContactAlias">Alias / nombre <span style="color:var(--c-text-3);font-weight:400;">(opcional)</span></label>
            <input
              type="text"
              id="newContactAlias"
              class="input-field"
              placeholder="Cómo quieres llamarle"
              autocomplete="off"
              maxlength="30"
            />
            <span class="input-hint">Solo visible para ti localmente</span>
          </div>

          <div class="security-note">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>El número se convierte en un hash criptográfico. <strong>Nunca se envía al servidor en texto plano.</strong></span>
          </div>

          <button class="btn btn-primary" id="btnSendRequest" disabled>
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Enviar solicitud de contacto
          </button>

          <button class="btn btn-ghost" id="btnCancelNewContact">
            Cancelar
          </button>
        </div>
      </div>
    `;
  }

  function mount() {
    const phoneInput = document.getElementById('newContactPhone');
    const btnSend    = document.getElementById('btnSendRequest');

    phoneInput.addEventListener('input', () => {
      btnSend.disabled = phoneInput.value.replace(/\s/g, '').length < 6;
    });

    btnSend.addEventListener('click', async () => {
      const prefix = document.getElementById('newContactPrefix').value;
      const phone  = prefix + phoneInput.value.replace(/\s/g, '');
      const alias  = document.getElementById('newContactAlias').value.trim();

      btnSend.disabled = true;
      btnSend.innerHTML = `<div class="spinner" style="width:20px;height:20px;border-width:2px;"></div> Enviando…`;

      try {
        await _sendContactRequest(phone, alias);
      } catch (e) {
        AppUI.showToast('Error al enviar solicitud: ' + e.message, 'error');
        btnSend.disabled = false;
        btnSend.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Enviar solicitud de contacto
        `;
      }
    });

    document.getElementById('btnCancelNewContact').addEventListener('click', () => {
      AppRouter.navigate('chats');
    });
  }

  async function _sendContactRequest(phoneNumber, alias) {
    // 1. Compute peer's lookup hash
    const peerHash = IdentityModule.computePeerHash(phoneNumber);

    // 2. Check we're not already in contact with this person
    const convs = StorageModule.getConversations();
    const existing = Object.values(convs).find(c => c.userHash === peerHash);
    if (existing) {
      AppUI.showToast('Ya tienes una conversación con este contacto', 'error');
      return;
    }

    // 3. Build signed contact request payload
    const signedPayload = IdentityModule.buildContactRequestPayload();

    // 4. Send to relay (or simulate in MVP)
    const requestId = CryptoModule.generateId();

    // Save as outgoing request
    StorageModule.saveOutgoingRequest({
      id: requestId,
      peerHash,
      peerAlias: alias || phoneNumber,
      phoneNumber,
      sentAt: Date.now(),
      status: 'pending',
    });

    // Send via WebSocket (if connected)
    WSModule.sendContactRequest(peerHash, signedPayload);

    // Simulate immediate local conversation creation (MVP mode)
    // In production: wait for CONTACT_ACCEPTED event from relay
    const kxKeys = CryptoModule.generateKeyExchangeKeypair();
    const sharedSecret = CryptoModule.computeSharedSecret(
      IdentityModule.getIdentity().kxPrivateKey,
      IdentityModule.getIdentity().kxPublicKey,
      kxKeys.publicKey,  // In MVP: use ephemeral key (both sides same)
      true
    );

    const conv = {
      id: CryptoModule.generateId(),
      userId: 'pending_' + requestId.slice(0, 8),
      userHash: peerHash,
      alias: alias || phoneNumber,
      kxPublicKey: kxKeys.publicKey,
      sigPublicKey: IdentityModule.getSigningPublicKey(),
      sharedKeyTx: sharedSecret.tx,
      sharedKeyRx: sharedSecret.rx,
      createdAt: Date.now(),
      ttlMs: null,
      unread: 0,
      lastMessage: '⏳ Solicitud pendiente de aceptación',
      lastTime: Date.now(),
      status: 'pending',
    };
    StorageModule.saveConversation(conv);

    AppUI.showToast('Solicitud enviada', 'success');
    await new Promise(r => setTimeout(r, 500));
    AppRouter.navigate('chats');
  }

  return { render, mount };
})();
