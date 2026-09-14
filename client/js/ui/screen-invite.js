/**
 * screen-invite.js — Invitation Code Screen
 * First screen seen by any user. They must enter a valid one-time invitation token.
 */

'use strict';

const ScreenInvite = (() => {
  function render() {
    return `
      <div class="screen screen-center" id="screenInvite">
        <div class="invite-hero">
          <div class="invite-icon">
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="20" width="48" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="2.5"/>
              <path d="M20 20V16a12 12 0 0124 0v4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
              <circle cx="32" cy="36" r="4" fill="currentColor"/>
              <path d="M32 40v6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
          </div>
          <h1 class="invite-title">SecureChat</h1>
          <p class="invite-subtitle">Mensajería privada por invitación. Sin registro público. Sin historial.</p>
        </div>

        <div class="invite-form">
          <div class="input-group">
            <label class="input-label" for="inviteTokenInput">Código de invitación</label>
            <input
              type="text"
              id="inviteTokenInput"
              class="input-field token-input"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="characters"
              spellcheck="false"
              maxlength="32"
            />
            <span class="input-hint" id="inviteTokenHint">Introduce el token que te envió la persona que te invitó</span>
          </div>

          <button class="btn btn-primary" id="btnValidateInvite" disabled>
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Verificar invitación
          </button>

          <div class="security-note">
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span>E2EE · Sin base de datos · Código abierto</span>
          </div>
        </div>
      </div>
    `;
  }

  function mount() {
    const input  = document.getElementById('inviteTokenInput');
    const btn    = document.getElementById('btnValidateInvite');
    const hint   = document.getElementById('inviteTokenHint');

    // Auto-format token as user types
    input.addEventListener('input', () => {
      let val = input.value.replace(/[^A-Z0-9a-z]/g, '').toUpperCase();
      // Insert dashes every 4 chars for readability
      val = val.match(/.{1,4}/g)?.join('-') || val;
      input.value = val;
      const clean = val.replace(/-/g, '');
      btn.disabled = clean.length < 8;
      hint.textContent = 'Introduce el token que te envió la persona que te invitó';
      hint.classList.remove('error');
    });

    btn.addEventListener('click', async () => {
      const token = input.value.replace(/-/g, '').toUpperCase();
      btn.disabled = true;
      btn.textContent = 'Verificando…';

      try {
        // In MVP without relay: simulate validation (any token >= 8 chars passes)
        // In production: WSModule.useInvite(token) and await relay response
        const valid = await _validateToken(token);

        if (valid) {
          AppRouter.navigate('verify', { inviteToken: token });
        } else {
          hint.textContent = 'Invitación inválida, expirada o ya utilizada.';
          hint.classList.add('error');
          input.value = '';
          btn.disabled = false;
          btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Verificar invitación
          `;
        }
      } catch (e) {
        AppUI.showToast('Error al conectar con el servidor', 'error');
        btn.disabled = false;
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Verificar invitación
        `;
      }
    });

    // Allow Enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !btn.disabled) btn.click();
    });

    // Focus input automatically
    setTimeout(() => input.focus(), 300);
  }

  async function _validateToken(token) {
    // MVP: Accept any token with at least 8 chars (no relay required)
    // In production: sends to relay and awaits INVITE_OK or ERROR
    if (token.length < 8) return false;

    // Simulate network delay
    await new Promise(r => setTimeout(r, 800));

    // In full implementation:
    // return new Promise((resolve) => {
    //   WSModule.useInvite(token);
    //   WSModule.on('inviteOk', () => resolve(true));
    //   WSModule.on('relayError', () => resolve(false));
    // });

    return true; // MVP: all valid-length tokens accepted
  }

  return { render, mount };
})();
