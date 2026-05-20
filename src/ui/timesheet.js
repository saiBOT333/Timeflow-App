import { state } from '../state.js';
import { formatMs, escapeHtml } from '../utils.js';
import { getRoundedMs, calculateNetDurationForDate } from '../calculations.js';
import { commitState, persistState, notifyStateChanged } from '../stateManager.js';
import { showAlert, showConfirm } from './dialogs.js';
import { deletePause, deleteAutoPauseFromTimesheet } from '../pauses.js';
import { switchProject } from '../projects.js';

// =============================================================================
// ui/timesheet.js – Stundenzettel (tägliche Zeiteinträge)
// =============================================================================

let timesheetDate = null;

export function getTimesheetDate() {
    if (!timesheetDate) {
        timesheetDate = new Date().toISOString().split('T')[0];
    }
    return timesheetDate;
}

export function navigateTimesheetDay(dir) {
    const d = new Date(getTimesheetDate() + 'T12:00:00');
    d.setDate(d.getDate() + dir);
    timesheetDate = d.toISOString().split('T')[0];
    notifyStateChanged();
}

export function goToTimesheetToday() {
    timesheetDate = new Date().toISOString().split('T')[0];
    notifyStateChanged();
}

// Passt benachbarte Log-Einträge anderer Projekte an, wenn eine Zeitgrenze verschoben wird
export function adjustAdjacentLogs(oldTs, newTs, fieldToAdjust) {
    if (!oldTs || oldTs === newTs) return;
    const tolerance = 60000; // 1 Minute Toleranz
    state.projects.forEach(proj => {
        (proj.logs || []).forEach(log => {
            if (fieldToAdjust === 'start') {
                if (log.start && Math.abs(log.start - oldTs) <= tolerance) {
                    if (!log.end || newTs < log.end) {
                        log.start = newTs;
                    }
                }
            } else if (fieldToAdjust === 'end') {
                if (log.end && Math.abs(log.end - oldTs) <= tolerance) {
                    if (newTs > log.start) {
                        log.end = newTs;
                    }
                }
            }
        });
    });
}

export function renderTimesheetCard() {
    const container = document.getElementById('timesheetContainer');
    if (!container) return;

    const viewDate = getTimesheetDate();
    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = viewDate === todayStr;
    const now = Date.now();
    const dayStart = new Date(viewDate + 'T00:00:00').getTime();
    const dayEnd = dayStart + 86400000;

    // Datumslabel aktualisieren
    const lbl = document.getElementById('timesheetDateLabel');
    if (lbl) {
        const d = new Date(viewDate + 'T12:00:00');
        const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
        lbl.textContent = dayNames[d.getDay()] + ', ' + d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear();
        lbl.classList.toggle('is-today', isToday);
    }

    // Alle Zeiteinträge des Tages aller Projekte sammeln
    const entries = [];
    state.projects.forEach(p => {
        (p.logs || []).forEach((log, logIdx) => {
            const logEnd = log.end || now;
            if (logEnd > dayStart && log.start < dayEnd) {
                const clampedStart = Math.max(log.start, dayStart);
                const clampedEnd = Math.min(logEnd, dayEnd);
                const parentProject = p.parentId ? state.projects.find(pp => pp.id === p.parentId) : null;
                entries.push({
                    project: p,
                    parentProject,
                    log,
                    logIdx,
                    clampedStart,
                    clampedEnd,
                    durationMs: clampedEnd - clampedStart,
                    isActive: !log.end
                });
            }
        });
    });

    // Pausen in die Timeline integrieren
    state.pauses.forEach(pause => {
        if (pause.active && viewDate !== todayStr) return;
        const pauseEnd = pause.active ? now : pause.endTs;
        if (!pauseEnd || pauseEnd <= dayStart || pause.startTs >= dayEnd) return;
        const clampedStart = Math.max(pause.startTs, dayStart);
        const clampedEnd = Math.min(pauseEnd, dayEnd);
        entries.push({
            isPause: true,
            pause,
            clampedStart,
            clampedEnd,
            durationMs: clampedEnd - clampedStart,
            isActive: !!pause.active
        });
    });

    entries.sort((a, b) => a.clampedStart - b.clampedStart);

    const dayTotalMs = state.projects.reduce((sum, p) => sum + calculateNetDurationForDate(p, viewDate), 0);
    const rounding = parseInt(state.settings.rounding || 0);
    const dayTotalR = getRoundedMs(dayTotalMs, rounding);

    let html = '';

    const projectEntryCount = entries.filter(e => !e.isPause).length;
    const pauseEntryCount = entries.filter(e => e.isPause).length;
    const entrySummary = projectEntryCount + ' Eintr' + (projectEntryCount === 1 ? 'ag' : '\u00e4ge')
        + (pauseEntryCount > 0 ? ' \u00b7 ' + pauseEntryCount + ' Pause' + (pauseEntryCount > 1 ? 'n' : '') : '');
    html += `<div class="ts-day-summary">
        <div class="ts-day-summary-left">
            <span class="material-symbols-rounded fs-20-primary">schedule</span>
            <span class="ts-day-summary-label">${isToday ? 'Heute gearbeitet' : 'Gearbeitet'}</span>
        </div>
        <div class="ts-day-summary-right">
            <span class="ts-day-summary-time">${formatMs(dayTotalR, false)}</span>
            <span class="ts-day-summary-entries">${entrySummary}</span>
        </div>
    </div>`;

    const hasProjects = state.projects.some(p => !p.archived);
    html += `<div class="ts-manual-row">
    <button type="button" class="ts-manual-btn" onclick="toggleManualEntryForm()"
        ${hasProjects ? '' : 'disabled title="Zuerst ein Projekt anlegen"'}>
        <span class="material-symbols-rounded fs-16">add</span>
        Eintrag hinzufügen
    </button>
    <div class="ts-manual-form is-hidden" id="tsManualForm">
        <select class="ts-manual-project" id="tsManualProject">
            ${getActiveProjectsForPicker().map(p =>
                `<option value="${p.id}">${escapeHtml(p.label)}</option>`
            ).join('')}
        </select>
        <input type="time" class="ts-time-input" id="tsManualStart" step="60">
        <span class="ts-entry-arrow">→</span>
        <input type="time" class="ts-time-input" id="tsManualEnd" step="60">
        <input type="text" class="ts-manual-note" id="tsManualNote" placeholder="Notiz (optional)">
        <button type="button" class="ts-manual-cancel" onclick="toggleManualEntryForm()">Abbrechen</button>
        <button type="button" class="ts-manual-save" onclick="submitManualEntry()">Speichern</button>
    </div>
</div>`;

    if (entries.length === 0) {
        html += '<div class="fs-13-variant" style="padding:20px; text-align:center; font-style:italic;">Keine Zeiteintr\u00e4ge f\u00fcr diesen Tag.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="ts-timeline">';
    entries.forEach((entry, i) => {
        const hasLineAfter = i < entries.length - 1;
        const lineHtml = hasLineAfter ? '<div class="ts-entry-timeline-line"></div>' : '';

        // --- Pause-Eintrag ---
        if (entry.isPause) {
            const startTime = new Date(entry.clampedStart).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const endTime = entry.isActive
                ? null
                : new Date(entry.clampedEnd).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const durationStr = formatMs(entry.durationMs, false);
            const typeIcon = entry.pause.type === 'auto' ? 'smart_toy' : 'coffee';
            const typeLabel = entry.pause.label || 'Pause';
            html += `<div class="ts-entry ${entry.isActive ? 'active' : ''}">
                <div class="ts-entry-timeline-dot" style="background:var(--md-sys-color-outline);"></div>
                ${lineHtml}
                <div class="ts-entry-content op-75" style="border-left: 2px solid var(--md-sys-color-outline-variant);">
                    <div class="ts-entry-header">
                        <span class="material-symbols-rounded fs-15 text-variant" style="flex-shrink:0;">${typeIcon}</span>
                        <span class="ts-entry-project text-variant">${escapeHtml(typeLabel)}</span>
                        <span class="ts-entry-duration text-variant">${durationStr}</span>
                    </div>
                    <div class="ts-entry-times">
                        <span class="fs-12 text-variant" style="font-family:'Roboto Mono',monospace;">${startTime}</span>
                        <span class="ts-entry-arrow">\u2192</span>
                        ${entry.isActive
                            ? '<span class="ts-entry-running">l\u00e4uft...</span>'
                            : `<span class="fs-12 text-variant" style="font-family:'Roboto Mono',monospace;">${endTime}</span>`
                        }
                        ${!entry.isActive
                            ? `<button class="icon-btn ts-delete-btn" onclick="${entry.pause.type === 'auto' ? `deleteAutoPauseFromTimesheet('${entry.pause.id}')` : `deletePause('${entry.pause.id}')`}" title="Pause l\u00f6schen"><span class="material-symbols-rounded fs-16">delete</span></button>`
                            : ''}
                    </div>
                </div>
            </div>`;
            return;
        }

        // --- Projekt-Eintrag ---
        const p = entry.project;
        const startTime = new Date(entry.clampedStart).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const endTime = entry.isActive ? 'l\u00e4uft...' : new Date(entry.clampedEnd).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const durationStr = formatMs(entry.durationMs, false);
        const pColor = p.color || '#757575';
        const isSub = !!p.parentId;
        const projectLabel = isSub && entry.parentProject
            ? entry.parentProject.name + ' \u2192 ' + p.name
            : p.name;
        const projectNum = p.number ? '#' + p.number : '';

        html += `<div class="ts-entry ${entry.isActive ? 'active' : ''}">
            <div class="ts-entry-timeline-dot" style="background:${pColor};"></div>
            ${lineHtml}
            <div class="ts-entry-content">
                <div class="ts-entry-header">
                    <div class="ts-entry-project-info">
                        <button type="button" class="ts-entry-project ts-entry-project-btn"
                            style="color:${pColor};"
                            title="Projekt wechseln"
                            onclick="toggleProjectPicker('${p.id}', ${entry.logIdx}, this)">
                            ${escapeHtml(projectLabel)}
                            <span class="material-symbols-rounded fs-14">expand_more</span>
                        </button>
                        ${projectNum ? `<span class="ts-entry-num">${projectNum}</span>` : ''}
                    </div>
                    <span class="ts-entry-duration">${durationStr}</span>
                </div>
                <div class="ts-entry-times">
                    <input type="time" class="ts-time-input" value="${startTime}" step="60"
                        onchange="updateTimesheetLogTime('${p.id}', ${entry.logIdx}, 'start', this.value, '${viewDate}')"
                        title="Startzeit bearbeiten">
                    <span class="ts-entry-arrow">\u2192</span>
                    ${entry.isActive
                        ? '<span class="ts-entry-running">l\u00e4uft...</span>'
                        : `<input type="time" class="ts-time-input" value="${endTime}" step="60"
                            onchange="updateTimesheetLogTime('${p.id}', ${entry.logIdx}, 'end', this.value, '${viewDate}')"
                            title="Endzeit bearbeiten">`
                    }
                    <button class="icon-btn ts-delete-btn" onclick="deleteTimesheetLog('${p.id}', ${entry.logIdx})" title="${entry.isActive ? 'Laufenden Eintrag verwerfen (Projekt wird gestoppt)' : 'Eintrag l\u00f6schen'}">
                        <span class="material-symbols-rounded fs-16">delete</span>
                    </button>
                </div>
                <div class="ts-entry-note-row">
                    <span class="material-symbols-rounded ts-note-icon">sticky_note_2</span>
                    <input type="text" class="ts-note-input ${entry.log.note ? 'has-note' : ''}"
                        value="${escapeHtml(entry.log.note || '')}"
                        placeholder="Notiz hinzuf\u00fcgen..."
                        onchange="saveTimesheetNote('${p.id}', ${entry.logIdx}, this.value)"
                        onkeydown="if(event.key==='Enter') this.blur();">
                </div>
            </div>
        </div>`;
    });
    html += '</div>';

    container.innerHTML = html;

    const overlaps = checkTimeOverlaps();
    showOverlapWarning(overlaps);
}

export function updateTimesheetLogTime(projectId, logIndex, type, value, dateStr) {
    const p = state.projects.find(x => x.id === projectId);
    if (!p || !p.logs[logIndex]) return;
    const log = p.logs[logIndex];
    const newTs = new Date(dateStr + 'T' + value + ':00').getTime();
    if (isNaN(newTs)) return;

    if (type === 'start' && log.end && newTs >= log.end) {
        showAlert('Startzeit muss vor der Endzeit liegen.', { title: 'Ung\u00fcltige Zeit', icon: 'error' });
        renderTimesheetCard();
        return;
    }
    if (type === 'end' && newTs <= log.start) {
        showAlert('Endzeit muss nach der Startzeit liegen.', { title: 'Ung\u00fcltige Zeit', icon: 'error' });
        renderTimesheetCard();
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
    commitState();
}

export function saveTimesheetNote(projectId, logIndex, value) {
    const p = state.projects.find(x => x.id === projectId);
    if (!p || !p.logs || !p.logs[logIndex]) return;
    p.logs[logIndex].note = value.trim();
    persistState();
}

export async function deleteTimesheetLog(projectId, logIndex) {
    const p = state.projects.find(x => x.id === projectId);
    if (!p || !p.logs[logIndex]) return;
    const log = p.logs[logIndex];
    const isActive = !log.end;
    const ok = await showConfirm(
        isActive
            ? 'Den laufenden Zeiteintrag verwerfen? Das Projekt wird dadurch gestoppt.'
            : 'Diesen Zeiteintrag l\u00f6schen?',
        {
            title: isActive ? 'Laufenden Eintrag verwerfen' : 'Eintrag l\u00f6schen',
            icon: 'delete',
            okText: isActive ? 'Verwerfen' : 'L\u00f6schen',
            danger: true
        }
    );
    if (!ok) return;
    p.logs.splice(logIndex, 1);
    // Offenen Log entfernt \u2192 Projekt stoppen, falls kein weiterer offener Log existiert.
    if (isActive && !p.logs.some(l => !l.end)) {
        p.status = 'stopped';
    }
    commitState();
}

function checkTimeOverlaps() {
    const viewDate = getTimesheetDate();
    const now = Date.now();
    const dayStart = new Date(viewDate + 'T00:00:00').getTime();
    const dayEnd = dayStart + 86400000;

    const entries = [];
    state.projects.forEach(p => {
        (p.logs || []).forEach((log) => {
            const logEnd = log.end || now;
            if (logEnd > dayStart && log.start < dayEnd) {
                entries.push({
                    projectName: p.name,
                    start: Math.max(log.start, dayStart),
                    end: Math.min(logEnd, dayEnd),
                    isActive: !log.end
                });
            }
        });
    });

    entries.sort((a, b) => a.start - b.start);

    const overlaps = [];
    for (let i = 0; i < entries.length - 1; i++) {
        for (let j = i + 1; j < entries.length; j++) {
            if (entries[i].end > entries[j].start) {
                const fmtTime = (ts) => new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                overlaps.push(
                    `${entries[i].projectName} (${fmtTime(entries[i].start)}-${fmtTime(entries[i].end)}) \u2194 ${entries[j].projectName} (${fmtTime(entries[j].start)}-${fmtTime(entries[j].end)})`
                );
            }
        }
    }
    return overlaps;
}

function showOverlapWarning(overlaps) {
    const container = document.getElementById('timesheetContainer');
    if (!container) return;
    const existing = container.querySelector('.ts-overlap-warning');
    if (existing) existing.remove();

    if (overlaps.length === 0) return;

    const warningDiv = document.createElement('div');
    warningDiv.className = 'ts-overlap-warning';
    warningDiv.innerHTML = `<span class="material-symbols-rounded">warning</span>
        <div>${overlaps.map(o => '\u26a0 Zeit\u00fcberlappung: ' + escapeHtml(o)).join('<br>')}</div>`;
    container.insertBefore(warningDiv, container.firstChild);
}

// =============================================================================
// addManualLog – manuell abgeschlossenen Eintrag anlegen
// =============================================================================
// Liefert true bei Erfolg, false bei Validierungsfehler.
function parseHHMM(value) {
    if (typeof value !== 'string') return null;
    const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return { h, min };
}

export function addManualLog(projectId, dateStr, startHHMM, endHHMM, note) {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) {
        showAlert('Bitte ein Projekt wählen.', { title: 'Kein Projekt', icon: 'error' });
        return false;
    }
    const s = parseHHMM(startHHMM);
    const e = parseHHMM(endHHMM);
    if (!s || !e) {
        showAlert('Ungültiges Zeitformat. Bitte HH:MM eingeben.', { title: 'Ungültige Zeit', icon: 'error' });
        return false;
    }
    const startTs = new Date(dateStr + 'T' + String(s.h).padStart(2, '0') + ':' + String(s.min).padStart(2, '0') + ':00').getTime();
    const endTs = new Date(dateStr + 'T' + String(e.h).padStart(2, '0') + ':' + String(e.min).padStart(2, '0') + ':00').getTime();
    if (isNaN(startTs) || isNaN(endTs)) {
        showAlert('Ungültiges Datum oder Zeit.', { title: 'Ungültige Zeit', icon: 'error' });
        return false;
    }
    if (endTs <= startTs) {
        showAlert('Endzeit muss nach der Startzeit liegen.', { title: 'Ungültige Zeit', icon: 'error' });
        return false;
    }
    if (!Array.isArray(project.logs)) project.logs = [];
    project.logs.push({ start: startTs, end: endTs, note: (note || '').trim() });
    commitState();
    return true;
}

// =============================================================================
// changeLogProject – Eintrag in anderes Projekt verschieben
// =============================================================================
// Für laufende Einträge wird stattdessen switchProject() aufgerufen.
// Liefert true bei Mutation, false sonst.
export function changeLogProject(oldProjectId, logIdx, newProjectId) {
    if (oldProjectId === newProjectId) return false;
    const oldP = state.projects.find(p => p.id === oldProjectId);
    const newP = state.projects.find(p => p.id === newProjectId);
    if (!oldP || !newP) return false;
    if (!Array.isArray(oldP.logs) || logIdx < 0 || logIdx >= oldP.logs.length) return false;
    const log = oldP.logs[logIdx];

    if (log.end === null || log.end === undefined) {
        switchProject(newProjectId);
        return true;
    }

    oldP.logs.splice(logIdx, 1);
    if (!Array.isArray(newP.logs)) newP.logs = [];
    newP.logs.push(log);
    commitState();
    return true;
}

// =============================================================================
// Projekt-Picker (Dropdown beim Klick auf Projektname)
// =============================================================================
let openPickerEl = null;

function getActiveProjectsForPicker() {
    return state.projects
        .filter(p => !p.archived)
        .map(p => {
            const parent = p.parentId ? state.projects.find(pp => pp.id === p.parentId) : null;
            const label = parent ? parent.name + ' → ' + p.name : p.name;
            return { id: p.id, label, color: p.color || '#757575', sortKey: (parent ? parent.name : p.name) + ' ' + p.name };
        })
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey, 'de'));
}

function closeProjectPicker() {
    if (openPickerEl) {
        openPickerEl.remove();
        openPickerEl = null;
        document.removeEventListener('click', onPickerOutsideClick, true);
        document.removeEventListener('keydown', onPickerKeydown, true);
    }
}

function onPickerOutsideClick(ev) {
    if (openPickerEl && !openPickerEl.contains(ev.target) && !ev.target.closest('.ts-entry-project-btn')) {
        closeProjectPicker();
    }
}

function onPickerKeydown(ev) {
    if (ev.key === 'Escape') closeProjectPicker();
}

export function toggleProjectPicker(projectId, logIdx, anchorBtn) {
    // Wenn ein Picker offen ist: schließen. Wenn er zum gleichen Anchor gehörte → fertig (Toggle-Verhalten).
    // Wenn er zu einem anderen Anchor gehörte → fall through und öffne den neuen.
    if (openPickerEl) {
        const wasSameAnchor = openPickerEl.parentElement === anchorBtn.closest('.ts-entry-content');
        closeProjectPicker();
        if (wasSameAnchor) return;
    }
    const list = getActiveProjectsForPicker();
    if (list.length === 0) return;
    const picker = document.createElement('div');
    picker.className = 'ts-project-picker';
    picker.innerHTML = list.map(p =>
        `<button type="button" class="ts-project-picker-item${p.id === projectId ? ' is-current' : ''}"
            onclick="pickProjectForLog('${projectId}', ${logIdx}, '${p.id}')">
            <span class="ts-project-picker-dot" style="background:${p.color};"></span>
            <span class="ts-project-picker-label">${escapeHtml(p.label)}</span>
        </button>`
    ).join('');

    const entryContent = anchorBtn.closest('.ts-entry-content');
    if (!entryContent) return;
    entryContent.appendChild(picker);
    openPickerEl = picker;

    setTimeout(() => {
        document.addEventListener('click', onPickerOutsideClick, true);
        document.addEventListener('keydown', onPickerKeydown, true);
    }, 0);
}

export function pickProjectForLog(oldProjectId, logIdx, newProjectId) {
    closeProjectPicker();
    changeLogProject(oldProjectId, logIdx, newProjectId);
}

// =============================================================================
// Manueller Eintrag – Inline-Formular
// =============================================================================
export function toggleManualEntryForm() {
    const form = document.getElementById('tsManualForm');
    if (!form) return;
    const willOpen = form.classList.contains('is-hidden');
    form.classList.toggle('is-hidden');
    if (willOpen) {
        const startInput = document.getElementById('tsManualStart');
        if (startInput) startInput.focus();
        document.addEventListener('keydown', onManualFormKeydown);
    } else {
        ['tsManualStart', 'tsManualEnd', 'tsManualNote'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.removeEventListener('keydown', onManualFormKeydown);
    }
}

function onManualFormKeydown(ev) {
    if (ev.key === 'Escape') {
        const form = document.getElementById('tsManualForm');
        if (form && !form.classList.contains('is-hidden')) toggleManualEntryForm();
    }
}

export function submitManualEntry() {
    const projectId = document.getElementById('tsManualProject')?.value;
    const startVal = document.getElementById('tsManualStart')?.value || '';
    const endVal = document.getElementById('tsManualEnd')?.value || '';
    const noteVal = document.getElementById('tsManualNote')?.value || '';
    const dateStr = getTimesheetDate();
    // Listener vorab abmelden: addManualLog → commitState → re-render entfernt das Form,
    // dadurch würde das Cleanup in toggleManualEntryForm nicht mehr greifen.
    document.removeEventListener('keydown', onManualFormKeydown);
    const ok = addManualLog(projectId, dateStr, startVal, endVal, noteVal);
    if (!ok) {
        // Form bleibt offen → Listener wieder anhängen.
        document.addEventListener('keydown', onManualFormKeydown);
    }
}

// onclick-Handler für inline HTML verfügbar machen
if (typeof window !== 'undefined') {
    window.navigateTimesheetDay = navigateTimesheetDay;
    window.goToTimesheetToday = goToTimesheetToday;
    window.updateTimesheetLogTime = updateTimesheetLogTime;
    window.saveTimesheetNote = saveTimesheetNote;
    window.deleteTimesheetLog = deleteTimesheetLog;
    window.deleteAutoPauseFromTimesheet = deleteAutoPauseFromTimesheet;
    window.deletePause = deletePause;
    window.toggleProjectPicker = toggleProjectPicker;
    window.pickProjectForLog = pickProjectForLog;
    window.toggleManualEntryForm = toggleManualEntryForm;
    window.submitManualEntry = submitManualEntry;
}
