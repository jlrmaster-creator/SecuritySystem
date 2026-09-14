/**
 * screen-chats.js — Chat List Screen (Home)
 */

'use strict';

const ScreenChats = (() => {
  let _connectionHandler = null;
  let _messageHandler = null;

  function render() {
    const conversations = StorageModule.getConversations();
    const convList = Object.values(conversations).sort((a, b) => b.lastTime - a.lastTime);
    const hasConvs = convList.length > 0;

    return `
      <div class="screen" id="screenChats" style="padding:0;">

        <!-- Connection status bar -->
        <div style="padding:8px 16px 0;display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:0.8rem;color:var(--c-text-3);">
            ${IdentityModule.getAlias() || 'Anónimo'}
          </span>
          <span id="connStatus" class="conn-status offline">
            <span class="conn-dot"></span>
            <span id="connStatusText">Sin conexión</span>
          </span>
        </div>

        <!-- Invite banner -->
        <div class="invite-banner" id="inviteBanner" style="margin:12px 16px;">
          <div class="invite-banner-icon">
            <svg viewBox="0 0 24 24" fill="none"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="6" y1="1" x2="6" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="1" x2="10" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="14" y1="1" x2="14" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </div>
          <div class="invite-banner-text">
            <div class="invite-banner-title">Invitar a alguien</div>
            <div class="invite-banner-sub">Genera un código de invitación de un solo uso</div>
          </div>
          <div class="invite-banner-arrow">
            <svg viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
        </div>

        <!-- Conversations -->
        ${hasConvs ? `
          <div class="chat-list" id="chatList">
            ${convList.map(conv => _renderChatItem(conv)).join('')}
          </div>
        ` : `
          <div class="empty-state" id="emptyState">
            <svg viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <h3>Sin conversaciones</h3>
            <p>Inicia una conversación usando el botón <strong>+</strong> o espera a que alguien te contacte.</p>
          </div>
        `}
      </div>
    `;
  }

  function _renderChatItem(conv) {
    const initials = (conv.alias || '?').slice(0, 2).toUpperCase();
    const timeStr  = _formatTime(conv.lastTime);
    const unread   = conv.unread > 0;

    return `
      <div class="chat-item" data-conv-id="${conv.id}" id="chatItem_${conv.id}">
        <div class="chat-avatar">
          ${initials}
          <span class="online-dot hidden" id="onlineDot_${conv.id}"></span>
        </div>
        <div class="chat-info">
          <div class="chat-name truncate">
            ${_escHtml(conv.alias || conv.userId.slice(0, 8))}
            <span class="e2ee-badge">
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="1.5"/></svg>
              E2EE
            </span>
          </div>
          <div class="chat-preview truncate" id="chatPreview_${conv.id}">
            ${_escHtml(conv.lastMessage || 'Conversación cifrada')}
          </div>
        </div>
        <div class="chat-meta">
          <span class="chat-time">${timeStr}</span>
          ${unread ? `<span class="chat-unread">${conv.unread > 9 ? '9+' : conv.unread}</span>` : ''}
        </div>
      </div>
    `;
  }

  function mount() {
    // Wire up connection status
    _updateConnectionStatus(WSModule.isConnected());

    _connectionHandler = ({ status }) => {
      _updateConnectionStatus(status === 'online');
    };
    WSModule.on('connectionChange', _connectionHandler);

    // Message received → update preview
    _messageHandler = ({ conversationId }) => {
      _refreshChatItem(conversationId);
    };
    WSModule.on('messageReceived', _messageHandler);

    // Chat items click
    document.getElementById('screenChats').addEventListener('click', (e) => {
      const item = e.target.closest('.chat-item');
      if (item) {
        const convId = item.dataset.convId;
        StorageModule.markConversationRead(convId);
        AppRouter.navigate('chat', { conversationId: convId });
      }

      if (e.target.closest('#inviteBanner')) {
        _showInviteDialog();
      }
    });

    // Header "+" button for new conversation
    document.getElementById('headerActions').innerHTML = `
      <button class="btn-icon" id="btnNewChat" aria-label="Nueva conversación">
        <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    `;
    document.getElementById('btnNewChat').addEventListener('click', () => {
      AppRouter.navigate('new-contact');
    });
  }

  function unmount() {
    if (_connectionHandler) WSModule.off('connectionChange', _connectionHandler);
    if (_messageHandler) WSModule.off('messageReceived', _messageHandler);
  }

  function _updateConnectionStatus(online) {
    const el   = document.getElementById('connStatus');
    const text = document.getElementById('connStatusText');
    if (!el) return;
    el.className = `conn-status ${online ? 'online' : 'offline'}`;
    text.textContent = online ? 'Conectado' : 'Sin conexión';
  }

  function _refreshChatItem(convId) {
    const conv = StorageModule.getConversation(convId);
    if (!conv) return;
    const item = document.getElementById(`chatItem_${convId}`);
    if (item) {
      const preview = item.querySelector(`#chatPreview_${convId}`);
      if (preview) preview.textContent = conv.lastMessage || 'Conversación cifrada';
      const meta = item.querySelector('.chat-unread');
      if (meta && conv.unread > 0) meta.textContent = conv.unread > 9 ? '9+' : conv.unread;
    }
  }

  function _showInviteDialog() {
    AppUI.showModal(
      'Generar invitación',
      'Genera un enlace de un solo uso para invitar a alguien. El código expira en 7 días.',
      [
        {
          label: 'Generar código',
          primary: true,
          action: () => {
            const token = CryptoModule.generateSecureToken(16).toUpperCase();
            const formatted = token.match(/.{1,4}/g).join('-');
            AppUI.showModal(
              '🔑 Tu código de invitación',
              `<div style="font-family:var(--font-mono);font-size:1.1rem;letter-spacing:0.1em;color:var(--c-accent);text-align:center;padding:16px 0;word-break:break-all;">${formatted}</div>
               <p style="font-size:0.8rem;color:var(--c-text-3);text-align:center;">Un solo uso · Caduca en 7 días · Compártelo de forma segura</p>`,
              [
                {
                  label: 'Copiar código',
                  primary: true,
                  action: () => {
                    navigator.clipboard.writeText(formatted).then(() => {
                      AppUI.showToast('Código copiado al portapapeles', 'success');
                    });
                  },
                },
                { label: 'Cerrar', action: () => {} },
              ]
            );
          },
        },
        { label: 'Cancelar', action: () => {} },
      ]
    );
  }

  function _formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  }

  function _escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return { render, mount, unmount };
})();
