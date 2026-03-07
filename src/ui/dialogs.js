// =============================================================================
// dialogs.js – Modales Confirm/Alert-System
// =============================================================================
// showConfirm(msg, opts) → Promise<boolean>  — Ja/Nein-Dialog
// showAlert(msg, opts)   → Promise<void>     — reiner Hinweis-Dialog
// resolveConfirmModal(result) → void         — Button-Handler (OK / Abbrechen)
// =============================================================================

let _confirmResolve = null;

export function showConfirm(message, { title = 'Bestätigung', icon = 'help_outline', okText = 'OK', cancelText = 'Abbrechen', danger = false } = {}) {
    return new Promise(resolve => {
        _confirmResolve = resolve;
        document.getElementById('confirmModalIcon').textContent = icon;
        document.getElementById('confirmModalTitle').textContent = title;
        document.getElementById('confirmModalMessage').textContent = message;
        const okBtn = document.getElementById('confirmModalOk');
        okBtn.textContent = okText;
        okBtn.className = danger ? 'md-btn' : 'md-btn md-btn-primary';
        document.getElementById('confirmModalCancel').textContent = cancelText;
        document.getElementById('confirmModalCancel').hidden = false;
        document.getElementById('confirmModal').classList.toggle('is-danger', danger);
        document.getElementById('confirmModal').classList.add('open');
    });
}

export function showAlert(message, { title = 'Hinweis', icon = 'info', okText = 'OK' } = {}) {
    return new Promise(resolve => {
        _confirmResolve = resolve;
        document.getElementById('confirmModalIcon').textContent = icon;
        document.getElementById('confirmModalTitle').textContent = title;
        document.getElementById('confirmModalMessage').textContent = message;
        document.getElementById('confirmModalOk').textContent = okText;
        document.getElementById('confirmModalOk').className = 'md-btn md-btn-primary';
        document.getElementById('confirmModalCancel').hidden = true;
        document.getElementById('confirmModal').classList.remove('is-danger');
        document.getElementById('confirmModal').classList.add('open');
    });
}

export function resolveConfirmModal(result) {
    document.getElementById('confirmModal').classList.remove('open');
    if (_confirmResolve) {
        _confirmResolve(result);
        _confirmResolve = null;
    }
}
