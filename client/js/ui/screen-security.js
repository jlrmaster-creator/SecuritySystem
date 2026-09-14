/**
 * screen-security.js — Security Settings Screen
 * Devices, keys, disappearing messages, app lock, emergency wipe.
 */

'use strict';

const ScreenSecurity = (() => {
  function render() {
    const identity  = IdentityModule.getIdentity();
    const settings  = StorageModule.getSettings();
    const deviceId  = StorageModule.getOrCreateDeviceId();
    const fp        = identity?.fingerprint || '—';
    const ttlMs     = settings.disappearingMs;

    return `
      <div class="screen" id="screenSecurity">

        <!-- Identity section -->
        <div class="security-section">
          <div class="security-section-title">Identidad</div>

          <div class="security-item" id="secFingerprint" style="cursor:default;">
            <div class="security-item-icon accent">
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 2a5 5 0 00-5 5v3H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2v-9a2 2 0 00-2-2h-2V7a5 5 0 00-5-5z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>
            </div>
            <div class="security-item-info">
              <div class="security-item-name">Huella de seguridad</div>
              <div class="security-item-sub mono" style="font-size:0.68rem;letter-spacing:0.05em;color:var(--c-accent);">${fp}</div>
            </div>
          </div>

          <div class="security-item" id="secPublicKey">
            <div class="security-item-icon">
              <svg viewBox="0 0 24 24" fill="none"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <div class="security-item-info">
              <div class="security-item-name">Tu clave pública</div>
              <div class="security-item-sub">Ver y copiar tu clave pública Ed25519</div>
            </div>
            <div class="security-item-action">
              <svg viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
          </div>
        </div>

        <!-- Disappearing messages -->
        <div class="security-section">
          <div class="security-section-title">Mensajes efímeros</div>

          <div style="background:var(--c-surface);border:1px solid var(--c-border);border-radius:var(--r-md);padding:16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
              <div>
                <div style="font-size:0.9rem;font-weight:500;">Mensajes que desaparecen</div>
                <div style="font-size:0.78rem;color:var(--c-text-2);margin-top:2px;" id="ttlCurrentLabel">
                  ${ttlMs ? _ttlLabel(ttlMs) : 'Desactivado (mensajes permanentes localmente)'}
                </div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="toggleDisappearing" ${ttlMs ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="ttl-options" id="ttlOptions" style="${ttlMs ? '' : 'opacity:0.4;pointer-events:none;'}">
              ${_renderTtlOption('1h',   3600000,   ttlMs)}
              ${_renderTtlOption('24h',  86400000,  ttlMs)}
              ${_renderTtlOption('7d',   604800000, ttlMs)}
              ${_renderTtlOption('30d',  2592000000,ttlMs)}
              ${_renderTtlOption('Off',  null,      ttlMs)}
              <div class="ttl-option" id="ttlCustom">Personalizado</div>
            </div>
          </div>
        </div>

        <!-- Devices -->
        <div class="security-section">
          <div class="security-section-title">Dispositivos vinculados</div>

          <div class="device-item current">
            <svg class="device-icon" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" stroke-width="2"/>
              <circle cx="12" cy="18" r="1" fill="currentColor"/>
            </svg>
            <div class="device-info">
              <div class="device-name">Este dispositivo</div>
              <div class="device-sub" style="font-family:var(--font-mono);font-size:0.7rem;">${deviceId.slice(0, 16)}…</div>
            </div>
            <span class="device-current-tag">Actual</span>
          </div>
        </div>

        <!-- App lock -->
        <div class="security-section">
          <div class="security-section-title">Bloqueo de aplicación</div>

          <div style="background:var(--c-surface);border:1px solid var(--c-border);border-radius:var(--r-md);padding:16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div style="font-size:0.9rem;font-weight:500;">Bloquear al ir al fondo</div>
                <div style="font-size:0.78rem;color:var(--c-text-2);margin-top:2px;">Requiere PIN al volver a la app</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="toggleLock" ${StorageModule.getSettings().lockOnBackground ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- Danger zone -->
        <div class="security-section">
          <div class="security-section-title" style="color:var(--c-danger);">Zona de peligro</div>

          <div class="security-item" id="secEmergencyWipe" style="border-color:rgba(255,82,82,0.2);">
            <div class="security-item-icon danger">
              <svg viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" stroke-width="2"/></svg>
            </div>
            <div class="security-item-info">
              <div class="security-item-name" style="color:var(--c-danger);">Borrado de emergencia</div>
              <div class="security-item-sub">Elimina TODOS los datos locales permanentemente</div>
            </div>
            <div class="security-item-action">
              <svg viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
          </div>
        </div>

        <!-- Version info -->
        <div style="text-align:center;padding:8px;color:var(--c-text-3);font-size:0.72rem;letter-spacing:0.04em;margin-top:8px;">
          SecureChat MVP v1.0 · Open Source · E2EE · libsodium
        </div>

      </div>
    `;
  }

  function _renderTtlOption(label, ms, currentTtl) {
    const selected = ms === currentTtl ? 'selected' : '';
    return `<div class="ttl-option ${selected}" data-ttl="${ms}" id="ttl_${label}">${label}</div>`;
  }

  function _ttlLabel(ms) {
    if (!ms) return 'Desactivado';
    const h = Math.floor(ms / 3600000);
    const d = Math.floor(h / 24);
    if (d >= 1) return `Los mensajes desaparecen después de ${d} día${d > 1 ? 's' : ''}`;
    return `Los mensajes desaparecen después de ${h} hora${h > 1 ? 's' : ''}`;
  }

  function mount() {
    const identity = IdentityModule.getIdentity();

    // Public key display
    document.getElementById('secPublicKey')?.addEventListener('click', () => {
      if (!identity) return;
      AppUI.showModal(
        'Tu clave pública Ed25519',
        `<div class="key-fingerprint" style="margin-bottom:12px;">${identity.sigPublicKey}</div>
         <p style="font-size:0.78rem;color:var(--c-text-2);">Esta clave pública identifica tu dispositivo. Compártela con tus contactos para verificar tu identidad.</p>`,
        [
          {
            label: 'Copiar clave',
            primary: true,
            action: () => {
              navigator.clipboard.writeText(identity.sigPublicKey).then(() => {
                AppUI.showToast('Clave copiada', 'success');
              });
            },
          },
          { label: 'Cerrar', action: () => {} },
        ]
      );
    });

    // Disappearing messages toggle
    document.getElementById('toggleDisappearing')?.addEventListener('change', (e) => {
      const options = document.getElementById('ttlOptions');
      options.style.opacity = e.target.checked ? '1' : '0.4';
      options.style.pointerEvents = e.target.checked ? 'auto' : 'none';
      if (!e.target.checked) {
        StorageModule.saveSettings({ disappearingMs: null });
        document.getElementById('ttlCurrentLabel').textContent = 'Desactivado (mensajes permanentes localmente)';
        document.querySelectorAll('.ttl-option').forEach(o => o.classList.remove('selected'));
      }
    });

    // TTL option selection
    document.getElementById('ttlOptions')?.addEventListener('click', (e) => {
      const opt = e.target.closest('.ttl-option');
      if (!opt || opt.id === 'ttlCustom') return;

      const ttlMs = opt.dataset.ttl === 'null' ? null : parseInt(opt.dataset.ttl);
      StorageModule.saveSettings({ disappearingMs: ttlMs });

      document.querySelectorAll('.ttl-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');

      const label = document.getElementById('ttlCurrentLabel');
      label.textContent = ttlMs ? _ttlLabel(ttlMs) : 'Desactivado';

      AppUI.showToast('Configuración guardada', 'success');
    });

    // Lock toggle
    document.getElementById('toggleLock')?.addEventListener('change', (e) => {
      StorageModule.saveSettings({ lockOnBackground: e.target.checked });
      AppUI.showToast(
        e.target.checked ? 'Bloqueo automático activado' : 'Bloqueo automático desactivado',
        'success'
      );
    });

    // Emergency wipe
    document.getElementById('secEmergencyWipe')?.addEventListener('click', () => {
      AppUI.showModal(
        '⚠️ Borrado de emergencia',
        'Esto eliminará PERMANENTEMENTE todos tus datos locales: claves, conversaciones, mensajes e identidad. Necesitarás una nueva invitación para volver a acceder.',
        [
          {
            label: 'Borrar todo ahora',
            danger: true,
            action: () => {
              AppUI.showModal(
                '¿Estás completamente seguro?',
                'Esta acción es IRREVERSIBLE. Todos los datos se eliminarán.',
                [
                  {
                    label: 'Confirmar borrado',
                    danger: true,
                    action: () => {
                      WSModule.disconnect();
                      StorageModule.nukeAllData();
                      IdentityModule.lock();
                      AppUI.showToast('Datos eliminados', 'success');
                      setTimeout(() => window.location.reload(), 1000);
                    },
                  },
                  { label: 'Cancelar', action: () => {} },
                ]
              );
            },
          },
          { label: 'Cancelar', action: () => {} },
        ]
      );
    });
  }

  return { render, mount };
})();
