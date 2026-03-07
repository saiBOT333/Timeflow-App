import { state } from '../state.js';
import { escapeHtml } from '../utils.js';
import { commitState } from '../stateManager.js';
import { showConfirm } from './dialogs.js';
import { layoutMasonry } from './masonry.js';

// =============================================================================
// ui/autoPauses.js – Auto-Pausen konfigurieren + rendern
// =============================================================================

let autoPausesPanelOpen = false;

export function isAutoPausesPanelOpen() {
    return autoPausesPanelOpen;
}

export function getLocalDateStr(date) {
    const d = date || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function getAutoPauses() {
    return state.settings.autoPauses || [];
}

function calcActiveFrom(startTime) {
    const now = new Date();
    const todayStr = getLocalDateStr(now);
    const startDt = new Date(todayStr + 'T' + startTime);
    if (Date.now() >= startDt.getTime()) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return getLocalDateStr(tomorrow);
    }
    return todayStr;
}

function timeSelectHtml(value, index, field) {
    const [vh, vm] = (value || '12:00').split(':');
    let opts = '';
    const valMin = parseInt(vm, 10);
    const hasCustomMin = valMin % 5 !== 0;
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 5) {
            if (hasCustomMin && h === parseInt(vh, 10) && m > valMin && (m - 5) < valMin) {
                const cv = vh + ':' + vm;
                opts += `<option value="${cv}" selected>${cv}</option>`;
            }
            const v = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
            const sel = v === value ? 'selected' : '';
            opts += `<option value="${v}" ${sel}>${v}</option>`;
        }
    }
    const title = field === 'start' ? 'Startzeit' : 'Endzeit';
    return `<select class="auto-pause-time-select" onchange="updateAutoPause(${index}, '${field}', this.value)" title="${title}">${opts}</select>`;
}

export function renderAutoPausesDisplay() {
    const container = document.getElementById('autoPausesDisplay');
    if (!container) return;
    const pauses = getAutoPauses();
    const isHO = state.settings.homeOffice;

    const toggleLabel = document.getElementById('autoPausesToggleLabel');
    if (toggleLabel) {
        const count = pauses.length;
        const hoHint = isHO ? ' (deaktiviert)' : '';
        toggleLabel.textContent = count > 0
            ? `Auto-Pausen (${count})${hoHint}`
            : 'Auto-Pausen konfigurieren';
    }

    if (pauses.length === 0) {
        container.innerHTML = `<div class="auto-pause-empty">
                    <span class="material-symbols-rounded fs-16 op-50">schedule_off</span>
                    <span>Keine automatischen Pausen konfiguriert.</span>
                    <button class="auto-pause-add-btn" onclick="addAutoPause()">
                        <span class="material-symbols-rounded fs-14">add</span> Hinzufügen
                    </button>
                </div>`;
        return;
    }

    let html = '<div class="auto-pause-list">';
    html += isHO ? `<div class="fs-11 text-error op-80 mb-6" style="display:flex; align-items:center; gap:4px;">
                <span class="material-symbols-rounded fs-14">info</span> Home Office aktiv — automatische Pausen werden heute nicht ausgelöst
            </div>` : '';

    const todayStr = getLocalDateStr();
    pauses.forEach((ap, i) => {
        const isDelayed = ap.activeFrom && todayStr < ap.activeFrom;
        html += `<div class="auto-pause-row ${isHO ? 'disabled' : ''}">
                    ${timeSelectHtml(ap.start, i, 'start')}
                    <span class="op-40">–</span>
                    ${timeSelectHtml(ap.end, i, 'end')}
                    <input type="text" class="auto-pause-label-input" value="${escapeHtml(ap.label)}"
                        onchange="updateAutoPause(${i}, 'label', this.value)" placeholder="Bezeichnung">
                    ${isDelayed ? `<span class="auto-pause-delayed-badge" title="Startzeit lag bereits in der Vergangenheit">ab morgen</span>` : ''}
                    <button class="icon-btn icon-btn-24 text-error op-50"
                        onclick="removeAutoPause(${i})" title="Automatische Pause entfernen">
                        <span class="material-symbols-rounded fs-16">close</span>
                    </button>
                </div>`;
    });

    html += `<button class="auto-pause-add-btn" onclick="addAutoPause()">
                <span class="material-symbols-rounded fs-14">add</span> Pause hinzufügen
            </button>`;
    html += '</div>';
    container.innerHTML = html;
}

export function updateAutoPause(index, field, value) {
    const pauses = getAutoPauses();
    if (!pauses[index]) return;
    if (field === 'start' || field === 'end') {
        if (!/^\d{2}:\d{2}$/.test(value)) return;
    }
    pauses[index][field] = value.trim();
    if (field === 'start') {
        pauses[index].activeFrom = calcActiveFrom(value.trim());
    }
    state.settings.autoPauses = pauses;
    commitState();
}

export function addAutoPause() {
    const pauses = getAutoPauses();
    const startTime = '12:00';
    pauses.push({ start: startTime, end: '12:30', label: 'Pause', activeFrom: calcActiveFrom(startTime) });
    state.settings.autoPauses = pauses;
    commitState();
}

export async function removeAutoPause(index) {
    const pauses = getAutoPauses();
    if (!pauses[index]) return;
    const ok = await showConfirm(`Automatische Pause „${pauses[index].label}" entfernen?`, {
        title: 'Pause entfernen', icon: 'delete', okText: 'Entfernen', danger: true
    });
    if (!ok) return;
    pauses.splice(index, 1);
    state.settings.autoPauses = pauses;
    commitState();
}

export function toggleAutoPausesPanel() {
    autoPausesPanelOpen = !autoPausesPanelOpen;
    const panel = document.getElementById('autoPausesDisplay');
    const btn = document.querySelector('.auto-pause-toggle-btn');
    panel.hidden = !autoPausesPanelOpen;
    if (btn) btn.classList.toggle('open', autoPausesPanelOpen);
    if (autoPausesPanelOpen) renderAutoPausesDisplay();
    layoutMasonry();
}

// onclick-Handler für inline HTML verfügbar machen
window.updateAutoPause = updateAutoPause;
window.addAutoPause = addAutoPause;
window.removeAutoPause = removeAutoPause;
window.toggleAutoPausesPanel = toggleAutoPausesPanel;
