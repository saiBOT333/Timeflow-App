// =============================================================================
// undo.js – Undo-Stack + Toast-Benachrichtigung + undo()-Aktion
// =============================================================================
// pushUndo(entry)   – Eintrag auf den Stack legen (max. 5)
// popUndo()         – Letzten Eintrag holen
// hasUndo()         – Prüfen ob etwas rückgängig gemacht werden kann
// showUndoToast(label) – Toast einblenden
// hideUndoToast()      – Toast ausblenden
// undo()            – Letzten Undo-Eintrag anwenden
// =============================================================================

import { state } from './state.js';
import { setFeierabendActive } from './ui/activeCard.js';
import { saveData } from './storage.js';
import { updateUI } from './ui/render.js';

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

export function undo() {
    if (!hasUndo()) return;
    const entry = popUndo();

    if (entry.type === 'deleteProject') {
        entry.data.forEach(p => {
            if (!state.projects.find(x => x.id === p.id)) {
                state.projects.push(p);
            }
        });
    } else if (entry.type === 'feierabend') {
        state.projects = entry.data;
        state.pauses = entry.pauses;
        setFeierabendActive(false);
    }

    saveData();
    updateUI();
    hideUndoToast();
}

window.undo = undo;
