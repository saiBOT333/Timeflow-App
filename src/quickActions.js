import { state } from './state.js';
import { getLocalDateStr } from './utils.js';
import { showAlert, showConfirm } from './ui/dialogs.js';
import { toggleManualPause } from './pauses.js';
import { startProject, stopAllProjects } from './projects.js';
import { setFeierabendActive } from './ui/activeCard.js';
import { persistState, persistStateImmediate } from './stateManager.js';
import { saveBackup } from './backupFolder.js';
import { pushUndo, showUndoToast } from './undo.js';
import { updateUI } from './ui/render.js';

function onGoodMorning() {
    setFeierabendActive(false);
    const running = state.projects.find(p => p.status === 'running');
    if (running) {
        showAlert("Ein Projekt läuft bereits!", { title: 'Start nicht möglich', icon: 'info' });
        return;
    }
    if (state.manualPauseActive) {
        toggleManualPause();
    }
    startProject('general');
    persistState();
    updateUI();
}

async function onFeierabend() {
    const ok = await showConfirm("Alle Timer werden gestoppt und ein Backup erstellt.", { title: 'Feierabend?', icon: 'bedtime', okText: 'Feierabend!', cancelText: 'Abbrechen' });
    if (ok) {
        pushUndo({ type: 'feierabend', data: JSON.parse(JSON.stringify(state.projects)), pauses: JSON.parse(JSON.stringify(state.pauses)), timestamp: Date.now(), label: 'Feierabend rückgängig' });
        stopAllProjects();
        if (state.manualPauseActive) {
            toggleManualPause();
        }
        setFeierabendActive(true);
        persistStateImmediate();
        updateUI();
        await saveBackup(state);
        showUndoToast('Feierabend rückgängig');
    }
}

function updateHomeOfficeBtn() {
    const btn = document.getElementById('homeOfficeBtn');
    if (!btn) return;
    const active = state.settings.homeOffice;
    btn.classList.toggle('is-active', active);
    const label = document.getElementById('homeOfficeBtnLabel');
    if (label) label.textContent = active ? 'Home Office ✓' : 'Home Office';
}

function toggleHomeOffice() {
    state.settings.homeOffice = !state.settings.homeOffice;
    if (state.settings.homeOffice) {
        const todayStr = getLocalDateStr();
        state.pauses = state.pauses.filter(p => {
            if (p.type !== 'auto') return true;
            const pDate = getLocalDateStr(new Date(p.startTs));
            return pDate !== todayStr;
        });
    }
    persistState();
    updateHomeOfficeBtn();
    updateUI();
}

window.onGoodMorning = onGoodMorning;
window.onFeierabend = onFeierabend;
window.toggleHomeOffice = toggleHomeOffice;

export { onGoodMorning, onFeierabend, toggleHomeOffice, updateHomeOfficeBtn };
