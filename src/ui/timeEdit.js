import { state, uiState } from '../state.js';
import { formatMs } from '../utils.js';
import { persistState, notifyStateChanged } from '../stateManager.js';
import { showAlert } from './dialogs.js';
import { adjustAdjacentLogs } from './timesheet.js';

// =============================================================================
// ui/timeEdit.js – Zeiteinträge eines Projekts bearbeiten (Modal)
// =============================================================================

export function openTimeEdit(projectId, e) {
    if (e) e.stopPropagation();
    const p = state.projects.find(x => x.id === projectId);
    if (!p) return;
    uiState.editingProjectId = projectId;
    document.getElementById('timeEditProjectTitle').innerText = (p.number || '') + ' ' + p.name;
    renderTimeEditLogs(p);
    document.getElementById('timeEditModal').classList.add('open');
}

export function renderTimeEditLogs(project) {
    const container = document.getElementById('timeEditLogList');
    const viewDate = uiState.viewDate;
    const dayStart = new Date(viewDate + 'T00:00:00').getTime();
    const dayEnd = dayStart + 86400000;

    const relevantLogs = [];
    (project.logs || []).forEach((log, idx) => {
        const logEnd = log.end || Date.now();
        if (logEnd > dayStart && log.start < dayEnd) {
            relevantLogs.push({ ...log, originalIndex: idx });
        }
    });

    if (relevantLogs.length === 0) {
        container.innerHTML = '<div class="fs-13-variant" style="padding:16px; text-align:center; font-style:italic;">Keine Eintr\u00e4ge f\u00fcr diesen Tag.</div>';
        return;
    }

    container.innerHTML = relevantLogs.map((log) => {
        const startDate = new Date(log.start);
        const endDate = log.end ? new Date(log.end) : null;
        const startTime = startDate.getHours().toString().padStart(2, '0') + ':' + startDate.getMinutes().toString().padStart(2, '0');
        const endTime = endDate ? endDate.getHours().toString().padStart(2, '0') + ':' + endDate.getMinutes().toString().padStart(2, '0') : 'l\u00e4uft...';
        const durationMs = (log.end || Date.now()) - log.start;
        const isActive = !log.end;

        return '<div style="display:flex; align-items:center; gap:8px; padding:10px 12px; background:var(--md-sys-color-surface-container-high); border-radius:8px;' + (isActive ? ' border:1px solid var(--md-sys-color-primary);' : '') + '">' +
            '<span class="material-symbols-rounded fs-18 text-variant">schedule</span>' +
            '<input type="text" value="' + startTime + '" ' +
                'onchange="updateLogTime(\'' + project.id + '\', ' + log.originalIndex + ', \'start\', this.value)" ' +
                'class="fs-14 text-on-surface" style="background:transparent; border:none; width:50px; text-align:center; font-family:monospace;">' +
            '<span class="op-50">\u2192</span>' +
            (isActive ?
                '<span class="fs-14 text-primary" style="font-family:monospace;">l\u00e4uft...</span>' :
                '<input type="text" value="' + endTime + '" ' +
                    'onchange="updateLogTime(\'' + project.id + '\', ' + log.originalIndex + ', \'end\', this.value)" ' +
                    'class="fs-14 text-on-surface" style="background:transparent; border:none; width:50px; text-align:center; font-family:monospace;">') +
            '<span class="fs-12-variant" style="flex:1; text-align:right; font-family:monospace;">' + formatMs(durationMs, false) + '</span>' +
            (!isActive ? '<button class="icon-btn icon-btn-24 text-error" onclick="deleteLog(\'' + project.id + '\', ' + log.originalIndex + ')" title="Eintrag l\u00f6schen"><span class="material-symbols-rounded fs-18">delete</span></button>' : '') +
        '</div>';
    }).join('');
}

export function updateLogTime(projectId, logIndex, type, value) {
    const p = state.projects.find(x => x.id === projectId);
    if (!p || !p.logs[logIndex]) return;
    const log = p.logs[logIndex];
    const refDate = new Date(log.start);
    const dateStr = refDate.getFullYear() + '-' + String(refDate.getMonth() + 1).padStart(2, '0') + '-' + String(refDate.getDate()).padStart(2, '0');
    const newTs = new Date(dateStr + 'T' + value + ':00').getTime();
    if (isNaN(newTs)) return;

    if (type === 'start' && log.end && newTs >= log.end) {
        showAlert('Startzeit muss vor der Endzeit liegen.', { title: 'Ungültige Zeit', icon: 'error' });
        renderTimeEditLogs(p);
        return;
    }
    if (type === 'end' && newTs <= log.start) {
        showAlert('Endzeit muss nach der Startzeit liegen.', { title: 'Ungültige Zeit', icon: 'error' });
        renderTimeEditLogs(p);
        return;
    }

    if (type === 'start') {
        const oldStart = log.start;
        log.start = newTs;
        adjustAdjacentLogs(oldStart, newTs, 'end');
    } else {
        const oldEnd = log.end;
        log.end = newTs;
        adjustAdjacentLogs(oldEnd, newTs, 'start');
    }
    persistState();
    renderTimeEditLogs(p);
    notifyStateChanged();
}

export function deleteLog(projectId, logIndex) {
    const p = state.projects.find(x => x.id === projectId);
    if (!p || !p.logs[logIndex]) return;
    if (p.logs[logIndex].end === null) return;
    p.logs.splice(logIndex, 1);
    persistState();
    renderTimeEditLogs(p);
    notifyStateChanged();
}

// onclick-Handler für inline HTML verfügbar machen
window.openTimeEdit = openTimeEdit;
window.updateLogTime = updateLogTime;
window.deleteLog = deleteLog;
