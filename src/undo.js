// =============================================================================
// undo.js – undo()-Aktion auf Basis des Undo-Stacks
// =============================================================================
// pushUndo(entry)   – Eintrag auf den Stack legen (max. 5)   → undoStack.js
// popUndo()         – Letzten Eintrag holen                  → undoStack.js
// hasUndo()         – Prüfen ob etwas rückgängig gemacht werden kann
// showUndoToast(label) – Toast einblenden
// hideUndoToast()      – Toast ausblenden
// undo()            – Letzten Undo-Eintrag anwenden
//
// Stack und Toast liegen in undoStack.js (ohne Importe), damit Module, die nur
// einen Snapshot ablegen, keinen Zyklus über render.js erzeugen.
// =============================================================================

import { state } from './state.js';
import { setFeierabendActive } from './ui/activeCard.js';
import { persistState } from './stateManager.js';
import { updateUI } from './ui/render.js';
import { popUndo, hasUndo, hideUndoToast } from './undoStack.js';

export { pushUndo, popUndo, hasUndo, showUndoToast, hideUndoToast } from './undoStack.js';

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
    } else if (entry.type === 'timesheet') {
        // Snapshot aller Projekte vor einer Stundenzettel-Änderung: die
        // Tageskette kann mehrere Einträge auf einmal berühren, deshalb wird
        // der komplette Projektstand zurückgespielt.
        state.projects = entry.data;
    }

    persistState();
    updateUI();
    hideUndoToast();
}

window.undo = undo;
