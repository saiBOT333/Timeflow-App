// =============================================================================
// undo.js – Undo-Stack + Toast-Benachrichtigung
// =============================================================================
// pushUndo(entry)   – Eintrag auf den Stack legen (max. 5)
// popUndo()         – Letzten Eintrag holen (für undo() in app.js)
// hasUndo()         – Prüfen ob etwas rückgängig gemacht werden kann
// showUndoToast(label) – Toast einblenden
// hideUndoToast()      – Toast ausblenden
// =============================================================================

let undoStack = [];
let undoToastTimeout = null;

export function pushUndo(entry) {
    undoStack.push(entry);
    if (undoStack.length > 5) undoStack.shift();
}

export function popUndo() {
    return undoStack.pop();
}

export function hasUndo() {
    return undoStack.length > 0;
}

export function showUndoToast(label) {
    const toast = document.getElementById('undoToast');
    const text = document.getElementById('undoToastText');
    if (!toast || !text) return;
    text.textContent = label;
    toast.classList.remove('hidden');
    if (undoToastTimeout) clearTimeout(undoToastTimeout);
    undoToastTimeout = setTimeout(() => {
        hideUndoToast();
    }, 8000);
}

export function hideUndoToast() {
    const toast = document.getElementById('undoToast');
    if (toast) toast.classList.add('hidden');
    if (undoToastTimeout) clearTimeout(undoToastTimeout);
}
