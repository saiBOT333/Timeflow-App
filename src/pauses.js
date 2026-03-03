import { state } from './state.js';
import { saveData } from './storage.js';
import { showConfirm } from './ui/dialogs.js';

// =============================================================================
// pauses.js – Pausen-Logik (manuell + automatisch)
// =============================================================================
// Alle Funktionen feuern nach State-Änderungen ein 'stateChanged'-Event,
// damit app.js updateUI() aufrufen kann, ohne eine Kreisabhängigkeit zu erzeugen.
// =============================================================================

function notifyStateChanged() {
    document.dispatchEvent(new CustomEvent('stateChanged'));
}

export function toggleManualPause() {
    const now = Date.now();
    if (state.manualPauseActive) {
        const pauseEntry = state.pauses.find(p => p.active);
        if (pauseEntry) {
            pauseEntry.active = false;
            pauseEntry.endTs = now;
        }
        state.manualPauseActive = false;
    } else {
        state.pauses.unshift({
            id: crypto.randomUUID(),
            startTs: now,
            endTs: null,
            type: 'manual',
            label: 'Pause',
            active: true
        });
        state.manualPauseActive = true;
    }
    saveData();
    notifyStateChanged();
}

export function deletePause(id) {
    const pause = state.pauses.find(p => p.id === id);
    if (!pause) return;

    // If deleting an active pause, reset status
    if (pause.active) {
        state.manualPauseActive = false;
    }

    state.pauses = state.pauses.filter(p => p.id !== id);
    saveData();
    notifyStateChanged();
}

export async function deleteAutoPauseFromTimesheet(pauseId) {
    const pause = state.pauses.find(p => p.id === pauseId);
    if (!pause || pause.type !== 'auto') return;
    const ok = await showConfirm(
        `Automatische Pause „${pause.label}" für heute löschen?`,
        { title: 'Autopause löschen', icon: 'delete', okText: 'Löschen', danger: true }
    );
    if (!ok) return;
    if (!state.settings.skippedAutoPauses) state.settings.skippedAutoPauses = [];
    state.settings.skippedAutoPauses.push({ startTs: pause.startTs });
    state.pauses = state.pauses.filter(p => p.id !== pauseId);
    saveData();
    notifyStateChanged();
}

export function endAutoPauseNow() {
    const now = Date.now();
    const pause = state.pauses.find(p =>
        p.type === 'auto' && now >= p.startTs && now < p.endTs
    );
    if (!pause) return;
    pause.endTs = now;
    saveData();
    notifyStateChanged();
}

export function updatePauseTime(id, type, value) {
    const pause = state.pauses.find(p => p.id === id);
    if (!pause) return;
    const todayStr = new Date(pause.startTs).toISOString().split('T')[0];
    const newTs = new Date(todayStr + 'T' + value).getTime();
    if (isNaN(newTs)) return;
    if (type === 'start' && pause.endTs && newTs >= pause.endTs) return;
    if (type === 'end' && newTs <= pause.startTs) return;
    if (type === 'start') pause.startTs = newTs;
    if (type === 'end') pause.endTs = newTs;
    saveData();
    notifyStateChanged();
}
