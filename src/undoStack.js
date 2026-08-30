// =============================================================================
// undoStack.js – Undo-Stack + Toast (ohne Abhängigkeiten)
// =============================================================================
// Bewusst ein Blatt-Modul: undo.js selbst importiert render.js/activeCard.js,
// um Einträge anzuwenden. Module, die nur etwas auf den Stack legen wollen
// (z. B. ui/timesheet.js), würden dadurch einen Import-Zyklus erzeugen. Sie
// importieren stattdessen von hier.
//
// undo.js re-exportiert alles, bestehende Importe bleiben also gültig.
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
    if (typeof document === 'undefined') return;
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
    if (typeof document === 'undefined') return;
    const toast = document.getElementById('undoToast');
    if (toast) toast.classList.add('hidden');
    if (undoToastTimeout) clearTimeout(undoToastTimeout);
}
