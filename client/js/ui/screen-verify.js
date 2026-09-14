/**
 * screen-verify.js — Identity Setup Screen
 * Steps: phone number → alias → generate keys → done
 */

'use strict';

const ScreenVerify = (() => {
  let _step = 1;
  let _phoneNumber = '';
  let _alias = '';
  let _pin = '';
  let _generatedKeys = null;

  function render() {
    return `
      <div class="screen" id="screenVerify">
        <div class="step-indicator" id="stepIndicator">
          <div class="step-dot active" id="dot1"></div>
          <div class="step-dot" id="dot2"></div>
          <div class="step-dot" id="dot3"></div>
        </div>

        <!-- Step 1: Phone -->
        <div id="step1">
          <h2 style="font-size:1.4rem;font-weight:700;letter-spacing:-0.03em;margin-bottom:8px;">Tu número de teléfono</h2>
          <p style="color:var(--c-text-2);font-size:0.88rem;line-height:1.6;margin-bottom:24px;">
            Tu número se usa solo para que otros te inviten. <strong>Nunca se envía al servidor en texto plano.</strong>
          </p>

          <div style="display:flex;flex-direction:column;gap:16px;">
            <div class="input-group">
              <label class="input-label" for="phonePrefix">Prefijo</label>
              <div class="phone-row">
                <select id="phonePrefix" class="input-field phone-prefix" style="cursor:pointer;">
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
                  id="phoneNumber"
                  class="input-field phone-number"
                  placeholder="612 345 678"
                  autocomplete="tel"
                  inputmode="numeric"
                  maxlength="15"
                />
              </div>
              <span class="input-hint">Solo para verificación. No se almacena en el servidor.</span>
            </div>

            <div class="input-group">
              <label class="input-label" for="aliasInput">Nombre / alias <span style="color:var(--c-text-3);font-weight:400;">(opcional)</span></label>
              <input
                type="text"
                id="aliasInput"
                class="input-field"
                placeholder="Cómo te llaman tus contactos"
                autocomplete="nickname"
                maxlength="30"
              />
              <span class="input-hint">Visible únicamente para tus contactos. Puede dejarse vacío.</span>
            </div>

            <div class="input-group">
              <label class="input-label" for="pinInput">PIN de bloqueo</label>
              <input
                type="password"
                id="pinInput"
                class="input-field"
                placeholder="Mínimo 6 caracteres"
                autocomplete="new-password"
                minlength="6"
                maxlength="20"
                inputmode="numeric"
              />
              <span class="input-hint" id="pinHint">Usado para cifrar tus claves localmente con Argon2id.</span>
            </div>

            <div class="input-group">
              <label class="input-label" for="pinConfirm">Confirmar PIN</label>
              <input
                type="password"
                id="pinConfirm"
                class="input-field"
                placeholder="Repite el PIN"
                autocomplete="new-password"
                maxlength="20"
                inputmode="numeric"
              />
            </div>

            <button class="btn btn-primary" id="btnStep1Next" disabled>
              Continuar
              <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>

        <!-- Step 2: Key generation -->
        <div id="step2" class="hidden">
          <h2 style="font-size:1.4rem;font-weight:700;letter-spacing:-0.03em;margin-bottom:8px;">Generando tus claves</h2>
          <p style="color:var(--c-text-2);font-size:0.88rem;line-height:1.6;margin-bottom:24px;">
            Se generan en tu dispositivo. <strong>Las claves privadas nunca salen de aquí.</strong>
          </p>

          <div class="crypto-generating" id="cryptoGenerating">
            <div class="spinner"></div>
            <p style="color:var(--c-text-2);font-size:0.88rem;" id="cryptoStatus">Iniciando libsodium…</p>
          </div>

          <div id="keyPreviewContainer" class="hidden" style="display:flex;flex-direction:column;gap:12px;">
            <div class="key-preview" id="kxKeyPreview">
              <div class="key-label">Clave pública X25519 (intercambio de claves)</div>
              <div id="kxPubDisplay"></div>
            </div>
            <div class="key-preview" id="sigKeyPreview">
              <div class="key-label">Clave pública Ed25519 (firma de identidad)</div>
              <div id="sigPubDisplay"></div>
            </div>
            <div class="key-preview" style="color:var(--c-warning);">
              <div class="key-label" style="color:var(--c-text-3);">Huella de seguridad (fingerprint)</div>
              <div id="fingerprintDisplay" style="letter-spacing:0.1em;"></div>
            </div>

            <div class="security-note" style="margin-top:8px;">
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2"/></svg>
              <span>Las claves privadas están cifradas con tu PIN (Argon2id) y nunca se transmiten.</span>
            </div>

            <button class="btn btn-primary" id="btnStep2Next">
              Completar registro
              <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>

        <!-- Step 3: Done -->
        <div id="step3" class="hidden" style="text-align:center;padding-top:32px;">
          <div style="width:80px;height:80px;background:var(--c-accent-dim);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;border:1px solid rgba(0,230,118,0.3);">
            <svg viewBox="0 0 24 24" fill="none" width="40" height="40" style="color:var(--c-accent);">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h2 style="font-size:1.5rem;font-weight:700;letter-spacing:-0.03em;margin-bottom:12px;color:var(--c-accent);">¡Listo!</h2>
          <p style="color:var(--c-text-2);font-size:0.9rem;line-height:1.7;margin-bottom:32px;">
            Tu identidad cifrada está creada.<br/>
            Solo tú tienes acceso a tus claves privadas.
          </p>
          <button class="btn btn-primary" id="btnGoToChats">
            Ir a mis chats
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  function mount() {
    _step = 1;
    _setupStep1();
  }

  function _setupStep1() {
    const phoneInput = document.getElementById('phoneNumber');
    const pinInput   = document.getElementById('pinInput');
    const pinConfirm = document.getElementById('pinConfirm');
    const pinHint    = document.getElementById('pinHint');
    const btnNext    = document.getElementById('btnStep1Next');

    function _validate() {
      const phone = phoneInput.value.replace(/\s/g, '');
      const pin   = pinInput.value;
      const pin2  = pinConfirm.value;

      const phoneOk = phone.length >= 6;
      const pinOk   = pin.length >= 6;
      const matchOk = pin === pin2;

      if (pin.length > 0 && !pinOk) {
        pinHint.textContent = 'El PIN debe tener al menos 6 caracteres.';
        pinHint.classList.add('error');
      } else if (pin2.length > 0 && !matchOk) {
        pinHint.textContent = 'Los PINs no coinciden.';
        pinHint.classList.add('error');
      } else {
        pinHint.textContent = 'Usado para cifrar tus claves localmente con Argon2id.';
        pinHint.classList.remove('error');
      }

      btnNext.disabled = !(phoneOk && pinOk && matchOk);
    }

    [phoneInput, pinInput, pinConfirm].forEach(el => el.addEventListener('input', _validate));

    btnNext.addEventListener('click', () => {
      const prefix = document.getElementById('phonePrefix').value;
      _phoneNumber = prefix + phoneInput.value.replace(/\s/g, '');
      _alias = document.getElementById('aliasInput').value.trim();
      _pin = pinInput.value;
      _goToStep2();
    });
  }

  async function _goToStep2() {
    _setStep(2);

    // Generate keys
    const statusEl = document.getElementById('cryptoStatus');

    statusEl.textContent = 'Generando par de claves X25519…';
    await _delay(400);
    const kxKeys = CryptoModule.generateKeyExchangeKeypair();

    statusEl.textContent = 'Generando par de claves Ed25519…';
    await _delay(400);
    const sigKeys = CryptoModule.generateSigningKeypair();

    statusEl.textContent = 'Calculando fingerprint…';
    await _delay(300);
    const fingerprint = CryptoModule.computeFingerprint(sigKeys.publicKey);

    _generatedKeys = { kxKeys, sigKeys, fingerprint };

    // Show keys
    document.getElementById('cryptoGenerating').classList.add('hidden');
    const kpc = document.getElementById('keyPreviewContainer');
    kpc.classList.remove('hidden');
    kpc.style.display = 'flex';

    document.getElementById('kxPubDisplay').textContent = kxKeys.publicKey;
    document.getElementById('sigPubDisplay').textContent = sigKeys.publicKey;
    document.getElementById('fingerprintDisplay').textContent = fingerprint;

    document.getElementById('btnStep2Next').addEventListener('click', _completeRegistration);
  }

  async function _completeRegistration() {
    const btn = document.getElementById('btnStep2Next');
    btn.disabled = true;
    btn.textContent = 'Guardando…';

    try {
      await IdentityModule.createIdentity(_phoneNumber, _alias, _pin);
      _goToStep3();
    } catch (e) {
      console.error('[Verify] Registration failed:', e);
      AppUI.showToast('Error al crear la identidad: ' + e.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Completar registro';
    }
  }

  function _goToStep3() {
    _setStep(3);
    document.getElementById('btnGoToChats').addEventListener('click', () => {
      // Connect to relay
      WSModule.connect();
      AppRouter.navigate('chats');
    });
  }

  function _setStep(n) {
    _step = n;
    for (let i = 1; i <= 3; i++) {
      document.getElementById(`step${i}`).classList.toggle('hidden', i !== n);
      const dot = document.getElementById(`dot${i}`);
      dot.classList.remove('active', 'done');
      if (i < n) dot.classList.add('done');
      else if (i === n) dot.classList.add('active');
    }
  }

  function _delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  return { render, mount };
})();
