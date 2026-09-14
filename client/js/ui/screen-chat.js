/**
 * screen-chat.js — Individual Conversation Screen
 * Shows E2EE encrypted messages, allows sending, shows delivery status.
 */

'use strict';

const ScreenChat = (() => {
  let _convId = null;
  let _conv   = null;
  let _messageHandler = null;
  let _deliveryHandler = null;

  function render(params = {}) {
    _convId = params.conversationId;
    _conv   = StorageModule.getConversation(_convId);

    if (!_conv) {
      return `<div class="screen"><p style="color:var(--c-danger);">Conversación no encontrada.</p></div>`;
    }

    const messages = StorageModule.getMessages(_convId);

    return `
      <div class="chat-screen" id="chatScreen">
        <div class="messages-area" id="messagesArea">
          <div class="e2ee-notice">
            <svg viewBox="0 0 24 24" fill="none" width="12" height="12"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2"/></svg>
            Cifrado extremo a extremo activo
          </div>
          <div id="messagesList">
            ${messages.length === 0
              ? `<div style="text-align:center;color:var(--c-text-3);font-size:0.82rem;margin-top:24px;">
                   Los mensajes se eliminan al entregarse y según tu política de retención.
                 </div>`
              : messages.map(_renderMsg).join('')
            }
          </div>
        </div>

        <div class="chat-input-area">
          <textarea
            id="chatInput"
            class="chat-textarea"
            placeholder="Mensaje cifrado…"
            rows="1"
            maxlength="4096"
          ></textarea>
          <button class="btn-send" id="btnSend" disabled aria-label="Enviar">
            <svg viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  function _renderMsg(msg) {
    const isOut = msg.direction === 'out';
    const timeStr = new Date(msg.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const ttlText = msg.expiresAt
      ? `<span class="msg-ttl"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>${_timeLeft(msg.expiresAt)}</span>`
      : '';

    const statusIcon = isOut ? _statusIcon(msg.status) : '';

    return `
      <div class="msg-bubble ${isOut ? 'out' : 'in'}" id="msg_${msg.id}">
        <div class="msg-content">${_escHtml(msg.content)}</div>
        <div class="msg-meta">
          <span class="msg-time">${timeStr}</span>
          ${statusIcon}
          ${ttlText}
        </div>
      </div>
    `;
  }

  function _statusIcon(status) {
    const icons = {
      sending:   `<span class="msg-status"><svg viewBox="0 0 24 24" fill="none" width="14" height="14"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/></svg></span>`,
      sent:      `<span class="msg-status"><svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`,
      delivered: `<span class="msg-status delivered"><svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M18 6L9 17l-5-5M22 6l-9 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`,
      read:      `<span class="msg-status read"><svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M18 6L9 17l-5-5M22 6l-9 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`,
    };
    return icons[status] || icons.sent;
  }

  function _timeLeft(expiresAt) {
    const ms = expiresAt - Date.now();
    if (ms <= 0) return 'expirado';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d`;
    if (h > 0) return `${h}h`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  }

  function mount() {
    if (!_conv) return;

    // Set header
    document.getElementById('appTitle').textContent = _conv.alias || 'Chat';
    document.getElementById('headerActions').innerHTML = `
      <button class="btn-icon" id="btnChatInfo" aria-label="Info del contacto">
        <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    `;
    document.getElementById('btnChatInfo')?.addEventListener('click', _showContactInfo);

    // Scroll to bottom
    _scrollToBottom();

    // Input handling
    const input = document.getElementById('chatInput');
    const btn   = document.getElementById('btnSend');

    input.addEventListener('input', () => {
      btn.disabled = input.value.trim().length === 0;
      // Auto-resize textarea
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!btn.disabled) btn.click();
      }
    });

    btn.addEventListener('click', _sendMessage);

    // Listen for incoming messages
    _messageHandler = ({ conversationId, message }) => {
      if (conversationId !== _convId) return;
      _appendMessage(message);
      _scrollToBottom();
    };
    WSModule.on('messageReceived', _messageHandler);

    // Listen for delivery ACKs
    _deliveryHandler = ({ messageId }) => {
      const el = document.getElementById(`msg_${messageId}`);
      if (el) {
        const statusEl = el.querySelector('.msg-status');
        if (statusEl) statusEl.className = 'msg-status delivered';
      }
    };
    WSModule.on('deliveryAck', _deliveryHandler);

    // Mark conversation as read
    StorageModule.markConversationRead(_convId);
  }

  function unmount() {
    if (_messageHandler) WSModule.off('messageReceived', _messageHandler);
    if (_deliveryHandler) WSModule.off('deliveryAck', _deliveryHandler);
    document.getElementById('headerActions').innerHTML = '';
  }

  function _sendMessage() {
    const input = document.getElementById('chatInput');
    const text  = input.value.trim();
    if (!text || !_conv) return;

    const msgId = CryptoModule.generateId();

    // Encrypt message with conversation's TX key
    let ciphertext;
    try {
      ciphertext = CryptoModule.encryptMessage(text, _conv.sharedKeyTx);
    } catch (e) {
      AppUI.showToast('Error al cifrar el mensaje', 'error');
      return;
    }

    // Save locally immediately (optimistic)
    const msg = {
      id: msgId,
      content: text,
      preview: text.slice(0, 40),
      direction: 'out',
      timestamp: Date.now(),
      status: 'sending',
      expiresAt: _conv.ttlMs ? Date.now() + _conv.ttlMs : null,
    };
    StorageModule.saveMessage(_convId, msg);

    // Append to UI
    _appendMessage(msg);
    _scrollToBottom();

    // Clear input
    input.value = '';
    input.style.height = 'auto';
    document.getElementById('btnSend').disabled = true;

    // Send via relay
    const sent = WSModule.sendMessage(_conv.userHash, ciphertext, msgId);

    if (sent) {
      // Update status to "sent"
      StorageModule.updateMessageStatus(_convId, msgId, 'sent');
      _updateMsgStatus(msgId, 'sent');
    } else {
      // Queued for when relay reconnects
      _updateMsgStatus(msgId, 'sending');
    }
  }

  function _appendMessage(msg) {
    const list = document.getElementById('messagesList');
    if (!list) return;

    // Remove empty state text if present
    const emptyEl = list.querySelector('[style*="text-align:center"]');
    if (emptyEl) emptyEl.remove();

    const div = document.createElement('div');
    div.innerHTML = _renderMsg(msg);
    list.appendChild(div.firstElementChild);
  }

  function _updateMsgStatus(msgId, status) {
    const el = document.getElementById(`msg_${msgId}`);
    if (!el) return;
    const statusEl = el.querySelector('.msg-status');
    if (statusEl) {
      statusEl.outerHTML = _statusIcon(status);
    }
  }

  function _scrollToBottom() {
    const area = document.getElementById('messagesArea');
    if (area) area.scrollTop = area.scrollHeight;
  }

  function _showContactInfo() {
    if (!_conv) return;
    const fp = CryptoModule.computeFingerprint(_conv.sigPublicKey || _conv.kxPublicKey);
    AppUI.showModal(
      `Información de ${_conv.alias || 'contacto'}`,
      `<div style="display:flex;flex-direction:column;gap:12px;">
        <div>
          <div style="font-size:0.72rem;color:var(--c-text-3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Huella de seguridad</div>
          <div class="key-fingerprint">${fp}</div>
        </div>
        <div style="font-size:0.78rem;color:var(--c-text-2);line-height:1.6;">
          Compara esta huella con tu contacto por un canal externo para verificar que no hay un intermediario (MITM).
        </div>
      </div>`,
      [
        {
          label: 'Eliminar conversación',
          danger: true,
          action: () => {
            AppUI.showModal(
              '¿Eliminar conversación?',
              'Todos los mensajes locales se eliminarán. Esta acción no puede deshacerse.',
              [
                {
                  label: 'Eliminar',
                  danger: true,
                  action: () => {
                    StorageModule.deleteConversation(_convId);
                    AppRouter.navigate('chats');
                    AppUI.showToast('Conversación eliminada', 'success');
                  },
                },
                { label: 'Cancelar', action: () => {} },
              ]
            );
          },
        },
        { label: 'Cerrar', action: () => {} },
      ]
    );
  }

  function _escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>');
  }

  return { render, mount, unmount };
})();
