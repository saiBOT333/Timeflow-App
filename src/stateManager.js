// =============================================================================
// stateManager.js – Zentrale State-Commit-API
// =============================================================================
// Kapselt das wiederkehrende Muster: State mutieren → persistieren → UI-Update.
//
// Warum diese Datei?
//   Vorher hatte jedes Modul eine eigene lokale notifyStateChanged()-Kopie
//   und musste saveData() + dispatchEvent('stateChanged') selbst kombinieren.
//   Jetzt gibt es vier klar benannte Funktionen:
//
//   commitState()          – Standard: persist + UI-Update         (häufigster Fall)
//   commitStateImmediate() – Sofort-persist + UI-Update            (Backup-Restore etc.)
//   persistState()         – Nur persist, kein UI-Update           (Layout-Saves)
//   notifyStateChanged()   – Nur UI-Update, kein Persist           (uiState-Änderungen)
//
// Kreisabhängigkeit vermieden:
//   storage.js → state.js  (storage importiert state)
//   stateManager.js → storage.js  (kein Kreis, state wird nicht re-importiert)
// =============================================================================

import { saveData, saveDataImmediate } from './storage.js';

function _dispatch() {
    document.dispatchEvent(new CustomEvent('stateChanged'));
}

/** State wurde bereits mutiert → persistieren + UI komplett neu rendern. */
export function commitState() {
    saveData();
    _dispatch();
}

/** Wie commitState(), aber synchron (für Backup-Restore und kritische Pfade). */
export function commitStateImmediate() {
    saveDataImmediate();
    _dispatch();
}

/** Nur persistieren – kein UI-Update (z.B. nach Layout-Drag, eigener Redraw). */
export function persistState() {
    saveData();
}

/** Nur persistieren, synchron – kein UI-Update (z.B. Feierabend-Backup). */
export function persistStateImmediate() {
    saveDataImmediate();
}

/** Nur UI-Update auslösen – kein Persist (z.B. uiState-Filter-Änderungen). */
export function notifyStateChanged() {
    _dispatch();
}
