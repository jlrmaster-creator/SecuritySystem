/**
 * screen-requests.js — Contact Requests Screen
 * Shows incoming pending contact requests. User accepts or rejects.
 */

'use strict';

const ScreenRequests = (() => {
  let _requestHandler = null;

  function render() {
    const requests = StorageModule.getPendingRequests();

    return `
      <div class="screen" id="screenRequests">
        <div style="margin-bottom:20px;">
          <h2 style="font-size:1.3rem;font-weight:700;letter-spacing:-0.03em;margin-bottom:6px;">Solicitudes de contacto</h2>
          <p style="color:var(--c-text-2);font-size:0.85rem;line-height:1.6;">
            Debes aceptar explícitamente cada solicitud. Solo tras aceptar se establece el canal cifrado.
          </p>
        </div>

        <div id="requestsList" style="display:flex;flex-direction:column;gap:12px;">
          ${requests.length === 0
            ? `<div class="empty-state" style="padding:48px 24px;">
                 <svg viewBox="0 0 24 24" fill="none" width="56" height="56"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                 <h3>Sin solicitudes</h3>
                 <p>No tienes solicitudes de contacto pendientes.</p>
               </div>`
            : requests.map(_renderRequest).join('')
          }
        </div>

        ${StorageModule.getOutgoingRequests().length > 0 ? `
          <div style="margin-top:28px;">
            <div class="security-section-title" style="margin-bottom:10px;">Solicitudes enviadas</div>
            <div style="display:flex;flex-direction:column;gap:8px;" id="outgoingList">
              ${StorageModule.getOutgoingRequests().map(_renderOutgoing).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function _renderRequest(req) {
    const initials = (req.fromAlias || '?').slice(0, 2).toUpperCase();
    const timeStr  = _relativeTime(req.receivedAt);

    return `
      <div class="request-item" id="req_${req.id}">
        <div class="request-header">
          <div class="request-avatar">${initials}</div>
          <div class="request-info">
            <div class="request-name">${_escHtml(req.fromAlias || req.fromUserId.slice(0, 12))}</div>
            <div class="request-sub">Recibida ${timeStr}</div>
          </div>
        </div>
        <div class="security-note" style="margin:0;font-size:0.78rem;">
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2"/></svg>
          <span>Solicitud firmada con Ed25519 · Verificada</span>
        </div>
        <div class="request-actions">
          <button class="btn btn-danger btn-sm" id="btnReject_${req.id}" data-req-id="${req.id}">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            Rechazar
          </button>
          <button class="btn btn-primary btn-sm" id="btnAccept_${req.id}" data-req-id="${req.id}">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Aceptar
          </button>
        </div>
      </div>
    `;
  }

  function _renderOutgoing(req) {
    return `
      <div style="display:flex;align-items:center;gap:12px;background:var(--c-surface);border:1px solid var(--c-border);border-radius:var(--r-md);padding:12px;" id="outReq_${req.id}">
        <div style="flex:1;">
          <div style="font-weight:500;font-size:0.88rem;">${_escHtml(req.peerAlias)}</div>
          <div style="font-size:0.75rem;color:var(--c-text-3);">Enviada ${_relativeTime(req.sentAt)} · Pendiente de aceptación</div>
        </div>
        <button class="btn-icon" id="btnCancelOut_${req.id}" data-req-id="${req.id}" aria-label="Cancelar">
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>
    `;
  }

  function mount() {
    const list = document.getElementById('requestsList');

    list.addEventListener('click', async (e) => {
      const acceptBtn = e.target.closest('[id^="btnAccept_"]');
      const rejectBtn = e.target.closest('[id^="btnReject_"]');
      const cancelBtn = e.target.closest('[id^="btnCancelOut_"]');

      if (acceptBtn) {
        const reqId = acceptBtn.dataset.reqId;
        await _acceptRequest(reqId);
      }
      if (rejectBtn) {
        const reqId = rejectBtn.dataset.reqId;
        _rejectRequest(reqId);
      }
      if (cancelBtn) {
        const reqId = cancelBtn.dataset.reqId;
        StorageModule.removeOutgoingRequest(reqId);
        document.getElementById(`outReq_${reqId}`)?.remove();
        AppUI.showToast('Solicitud cancelada', 'success');
      }
    });

    // Real-time contact request handler
    _requestHandler = (req) => {
      // Refresh the list
      const container = document.getElementById('requestsList');
      if (!container) return;
      const emptyEl = container.querySelector('.empty-state');
      if (emptyEl) emptyEl.remove();

      const div = document.createElement('div');
      div.innerHTML = _renderRequest(req);
      container.prepend(div.firstElementChild);
      AppUI.showToast(`Nueva solicitud de contacto de ${req.fromAlias || 'desconocido'}`, 'success');
    };
    WSModule.on('contactRequest', _requestHandler);
  }

  function unmount() {
    if (_requestHandler) WSModule.off('contactRequest', _requestHandler);
  }

  async function _acceptRequest(requestId) {
    const requests = StorageModule.getPendingRequests();
    const req = requests.find(r => r.id === requestId);
    if (!req) return;

    const btn = document.getElementById(`btnAccept_${requestId}`);
    btn.disabled = true;
    btn.textContent = 'Aceptando…';

    try {
      // Accept and compute shared secret
      const conv = IdentityModule.acceptContactRequest(req);
      StorageModule.saveConversation(conv);
      StorageModule.removePendingRequest(requestId);

      // Notify relay
      const responsePayload = IdentityModule.buildContactRequestPayload();
      WSModule.acceptContactRequest(requestId, responsePayload);

      // Remove from UI
      document.getElementById(`req_${requestId}`)?.remove();
      AppUI.showToast(`Contacto añadido: ${req.fromAlias || 'nuevo contacto'}`, 'success');

      // Update badge
      _updateBadge();
    } catch (e) {
      AppUI.showToast('Error al aceptar la solicitud: ' + e.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Aceptar';
    }
  }

  function _rejectRequest(requestId) {
    const requests = StorageModule.getPendingRequests();
    const req = requests.find(r => r.id === requestId);
    if (!req) return;

    StorageModule.removePendingRequest(requestId);
    WSModule.rejectContactRequest(requestId);
    document.getElementById(`req_${requestId}`)?.remove();
    AppUI.showToast('Solicitud rechazada', 'success');
    _updateBadge();
  }

  function _updateBadge() {
    const count = StorageModule.getPendingRequests().length;
    const badge = document.getElementById('requestsBadge');
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('hidden', count === 0);
    }
  }

  function _relativeTime(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `hace ${d} día${d > 1 ? 's' : ''}`;
    if (h > 0) return `hace ${h} hora${h > 1 ? 's' : ''}`;
    if (m > 0) return `hace ${m} min`;
    return 'ahora mismo';
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
