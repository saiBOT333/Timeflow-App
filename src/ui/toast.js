// =============================================================================
// ui/toast.js – Kurze Info-Meldung (ohne Aktion)
// =============================================================================
// Bewusst ein Blatt-Modul ohne Importe: der CSV-Export meldet damit, wohin die
// Datei geschrieben wurde, ohne einen modalen Dialog zu öffnen.
// Markup: #infoToast / #infoToastText (nutzt die .undo-toast-Optik).
// =============================================================================

let infoToastTimeout = null;

export function showInfoToast(message, duration = 4000) {
    if (typeof document === 'undefined') return;
    const toast = document.getElementById('infoToast');
    const text = document.getElementById('infoToastText');
    if (!toast || !text) return;
    text.textContent = message;
    toast.classList.remove('hidden');
    if (infoToastTimeout) clearTimeout(infoToastTimeout);
    infoToastTimeout = setTimeout(hideInfoToast, duration);
}

export function hideInfoToast() {
    if (typeof document === 'undefined') return;
    const toast = document.getElementById('infoToast');
    if (toast) toast.classList.add('hidden');
    if (infoToastTimeout) clearTimeout(infoToastTimeout);
    infoToastTimeout = null;
}
