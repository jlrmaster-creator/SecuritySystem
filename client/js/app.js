/**
 * app.js — SecureChat Main Application Controller
 *
 * Responsibilities:
 *  - Initialize libsodium and all modules
 *  - Route between screens
 *  - Manage app-level UI (header, bottom nav, toasts, modals)
 *  - Handle background/foreground events (locking)
 *  - Start periodic sweeps (expired messages cleanup)
 */

'use strict';

// ── App Router ────────────────────────────────────────────

const AppRouter = (() => {
  const SCREENS = {
    'invite':      { module: ScreenInvite,     title: 'SecureChat',           showNav: false, showBack: false },
    'verify':      { module: ScreenVerify,     title: 'Configurar identidad', showNav: false, showBack: true  },
    'chats':       { module: ScreenChats,      title: 'SecureChat',           showNav: true,  showBack: false },
    'chat':        { module: ScreenChat,       title: 'Chat',                 showNav: false, showBack: true  },
    'new-contact': { module: ScreenNewContact, title: 'Nuevo contacto',       showNav: false, showBack: true  },
    'requests':    { module: ScreenRequests,   title: 'Solicitudes',          showNav: true,  showBack: false },
    'security':    { module: ScreenSecurity,   title: 'Seguridad',            showNav: true,  showBack: false },
  };

  let _current = null;
  let _currentModule = null;
  let _params = {};

  function navigate(screen, params = {}) {
    if (!SCREENS[screen]) {
      console.error('[Router] Unknown screen:', screen);
      return;
    }

    // Unmount current screen if it has an unmount handler
    if (_currentModule?.unmount) {
      try { _currentModule.unmount(); } catch (e) { console.warn('[Router] Unmount error:', e); }
    }

    _current = screen;
    _params  = params;
    const config = SCREENS[screen];
    _currentModule = config.module;

    // Render screen
    const container = document.getElementById('screenContainer');
    container.innerHTML = config.module.render(params);

    // Update header
    document.getElementById('appTitle').textContent = config.title;
    document.getElementById('appHeader').classList.toggle('hidden', !config.showNav && !config.showBack && screen !== 'chats');
    document.getElementById('appHeader').classList.remove('hidden');
    document.getElementById('btnBack').classList.toggle('hidden', !config.showBack);
    document.getElementById('headerActions').innerHTML = '';

    // Update bottom nav
    const nav = document.getElementById('bottomNav');
    nav.classList.toggle('hidden', !config.showNav);

    if (config.showNav) {
      ['chats', 'requests', 'security'].forEach(s => {
        const btn = document.getElementById(`nav${s.charAt(0).toUpperCase() + s.slice(1)}`);
        btn?.classList.toggle('active', s === screen);
      });
    }

    // Mount screen logic
    if (config.module.mount) {
      try { config.module.mount(params); } catch (e) { console.error('[Router] Mount error:', e); }
    }

    // Scroll to top
    document.getElementById('screenContainer').scrollTop = 0;
  }

  function getCurrentScreen() { return _current; }
  function getCurrentParams()  { return _params; }

  return { navigate, getCurrentScreen, getCurrentParams };
})();

// ── App UI ─────────────────────────────────────────────────

const AppUI = (() => {
  let _toastTimer = null;
  let _modalCallbacks = [];

  function showToast(message, type = 'default', durationMs = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    clearTimeout(_toastTimer);
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    _toastTimer = setTimeout(() => {
      toast.className = 'toast';
    }, durationMs);
  }

  /**
   * Show a bottom sheet modal.
   *
   * @param {string} title
   * @param {string} bodyHtml - Can include HTML
   * @param {Array<{label, action, primary?, danger?}>} buttons
   */
  function showModal(title, bodyHtml, buttons = []) {
    const overlay = document.getElementById('modal');
    const titleEl = document.getElementById('modalTitle');
    const bodyEl  = document.getElementById('modalBody');
    const actionsEl = document.getElementById('modalActions');

    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHtml;

    actionsEl.innerHTML = '';
    _modalCallbacks = [];

    buttons.forEach((btn, i) => {
      const el = document.createElement('button');
      el.className = `btn ${btn.primary ? 'btn-primary' : btn.danger ? 'btn-danger' : 'btn-secondary'}`;
      el.textContent = btn.label;
      el.id = `modalBtn_${i}`;
      el.addEventListener('click', () => {
        _closeModal();
        if (btn.action) btn.action();
      });
      actionsEl.appendChild(el);
    });

    overlay.classList.remove('hidden');

    // Close on backdrop click
    overlay.onclick = (e) => {
      if (e.target === overlay) _closeModal();
    };
  }

  function _closeModal() {
    document.getElementById('modal').classList.add('hidden');
  }

  function closeModal() { _closeModal(); }

  return { showToast, showModal, closeModal };
})();

// ── App Init ───────────────────────────────────────────────

const App = (() => {
  let _initialized = false;
  let _sweepInterval = null;

  async function init() {
    if (_initialized) return;

    // Animate splash bar
    const fill = document.getElementById('splashBarFill');
    const setProgress = (p) => { if (fill) fill.style.width = `${p}%`; };

    setProgress(10);

    try {
      // 1. Initialize libsodium
      setProgress(30);
      await CryptoModule.init();

      setProgress(60);

      // 2. Sweep expired messages
      StorageModule.sweepExpiredMessages();

      setProgress(80);

      // 3. Wire up back button
      document.getElementById('btnBack').addEventListener('click', _handleBack);

      // 4. Wire up bottom nav
      document.getElementById('bottomNav').addEventListener('click', (e) => {
        const item = e.target.closest('.nav-item');
        if (item) AppRouter.navigate(item.dataset.screen);
      });

      // 5. Handle app background/foreground for locking
      document.addEventListener('visibilitychange', _onVisibilityChange);

      // 6. Start periodic sweep
      _sweepInterval = setInterval(() => {
        StorageModule.sweepExpiredMessages();
      }, 60 * 1000); // Every minute

      setProgress(100);

      // 7. Determine initial screen
      await new Promise(r => setTimeout(r, 300));

    } catch (e) {
      console.error('[App] Initialization failed:', e);
    }

    // 8. Hide splash, show app
    const splash = document.getElementById('splash');
    splash.classList.add('fade-out');
    setTimeout(() => {
      splash.classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');

      // Route to correct initial screen
      _routeInitial();
    }, 400);

    _initialized = true;
  }

  function _routeInitial() {
    // Check URL params for invite token (deep link support)
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get('invite');

    if (inviteToken) {
      // Pre-fill invite token from URL
      AppRouter.navigate('invite', { prefilledToken: inviteToken });
      return;
    }

    // Check if user has an existing identity
    if (!IdentityModule.isRegistered()) {
      AppRouter.navigate('invite');
      return;
    }

    // User is registered. Check if locked.
    // For MVP: auto-unlock without PIN prompt on first load
    // In production: show PIN lock screen
    _tryAutoUnlock();
  }

  async function _tryAutoUnlock() {
    // MVP: Show a PIN prompt to unlock
    const salt = StorageModule.getPinSalt();
    if (!salt) {
      AppRouter.navigate('invite');
      return;
    }

    // Show PIN unlock modal
    AppUI.showModal(
      '🔐 Desbloquear SecureChat',
      `<div style="display:flex;flex-direction:column;gap:12px;">
        <div class="input-group">
          <label class="input-label" for="unlockPin">PIN de acceso</label>
          <input type="password" id="unlockPin" class="input-field" placeholder="Tu PIN" autocomplete="current-password" inputmode="numeric" autofocus />
          <span class="input-hint" id="unlockHint">Introduce tu PIN para descifrar tus claves</span>
        </div>
      </div>`,
      [
        {
          label: 'Desbloquear',
          primary: true,
          action: async () => {
            const pin = document.getElementById('unlockPin')?.value;
            if (!pin) { AppUI.showToast('Introduce tu PIN', 'error'); return; }
            try {
              await IdentityModule.unlockWithPin(pin);
              WSModule.connect();
              AppRouter.navigate('chats');
              _updateRequestsBadge();
            } catch {
              AppUI.showToast('PIN incorrecto', 'error');
              setTimeout(() => _tryAutoUnlock(), 300);
            }
          },
        },
      ]
    );

    // Unlock on Enter key
    setTimeout(() => {
      const pinInput = document.getElementById('unlockPin');
      if (pinInput) {
        pinInput.focus();
        pinInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            document.getElementById('modalBtn_0')?.click();
          }
        });
      }
    }, 100);
  }

  function _handleBack() {
    const current = AppRouter.getCurrentScreen();
    const backMap = {
      'verify':      'invite',
      'chat':        'chats',
      'new-contact': 'chats',
    };
    const target = backMap[current];
    if (target) AppRouter.navigate(target);
  }

  let _hiddenAt = null;
  function _onVisibilityChange() {
    const settings = StorageModule.getSettings();
    if (document.hidden) {
      _hiddenAt = Date.now();
    } else {
      // If the app was hidden for more than 5 minutes, lock it
      if (settings.lockOnBackground && _hiddenAt && (Date.now() - _hiddenAt > 5 * 60 * 1000)) {
        IdentityModule.lock();
        _tryAutoUnlock();
      }
      _hiddenAt = null;
    }
  }

  function _updateRequestsBadge() {
    const count = StorageModule.getPendingRequests().length;
    const badge = document.getElementById('requestsBadge');
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('hidden', count === 0);
    }
  }

  return { init };
})();

// ── Boot ───────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  // Ensure libsodium global is available
  if (typeof sodium === 'undefined') {
    console.error('[App] libsodium not loaded. Check CDN connectivity.');
    document.getElementById('splashBarFill').style.background = 'var(--c-danger)';
    return;
  }

  App.init();
});

// Handle unhandled promise rejections gracefully
window.addEventListener('unhandledrejection', (e) => {
  console.error('[App] Unhandled rejection:', e.reason);
});
