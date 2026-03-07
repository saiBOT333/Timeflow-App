import { state, uiState } from '../state.js';
import { formatMs, formatMsDecimal, getWeekDates, getISOWeekNumber, escapeHtml } from '../utils.js';
import { calculateNetDurationForDate } from '../calculations.js';
import { commitState, notifyStateChanged } from '../stateManager.js';

// =============================================================================
// ui/weeklyOverview.js – Wochenübersicht
// =============================================================================

export function navigateWeek(offset) {
    const d = new Date(uiState.viewWeekStart + 'T12:00:00');
    d.setDate(d.getDate() + offset * 7);
    uiState.viewWeekStart = d.toISOString().split('T')[0];
    notifyStateChanged();
}

export function goToCurrentWeek() {
    const todayStr = new Date().toISOString().split('T')[0];
    uiState.viewWeekStart = getWeekDates(todayStr)[0];
    notifyStateChanged();
}

export function toggleWeekend() {
    state.settings.showWeekend = !state.settings.showWeekend;
    commitState();
}

export function toggleWeeklyDecimal() {
    uiState.weeklyDecimal = !uiState.weeklyDecimal;
    renderWeeklyOverview();
}

export function toggleWeeklyCollapse(parentId) {
    if (uiState.collapsedWeeklyParents.has(parentId)) {
        uiState.collapsedWeeklyParents.delete(parentId);
    } else {
        uiState.collapsedWeeklyParents.add(parentId);
    }
    notifyStateChanged();
}

export function toggleWeeklyRowMark(event, projectId) {
    if (event.target.closest('.weekly-collapse-btn, .weekly-note-marker')) return;
    if (uiState.weeklyMarkedRows.has(projectId)) {
        uiState.weeklyMarkedRows.delete(projectId);
    } else {
        uiState.weeklyMarkedRows.add(projectId);
    }
    renderWeeklyOverview();
}

export function showNotePopup(event, projectId, dateStr) {
    event.stopPropagation();
    closeNotePopup();

    const p = state.projects.find(x => x.id === projectId);
    if (!p) return;

    const dayStart = new Date(dateStr + 'T00:00:00').getTime();
    const dayEnd = dayStart + 86400000;
    const dayNotes = (p.logs || []).filter(function(log) {
        const logEnd = log.end || Date.now();
        return logEnd > dayStart && log.start < dayEnd && log.note;
    });

    if (dayNotes.length === 0) return;

    const d = new Date(dateStr + 'T12:00:00');
    const dateLabel = d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear();

    let popupHtml = '<div class="note-popup-title">' + escapeHtml(p.name) + ' \u00b7 ' + dateLabel + '</div>';
    dayNotes.forEach(function(log) {
        const startTime = new Date(Math.max(log.start, dayStart)).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const endTime = log.end
            ? new Date(Math.min(log.end, dayEnd)).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
            : 'l\u00e4uft...';
        popupHtml += '<div class="note-popup-item">'
            + '<span class="note-popup-time">' + startTime + '\u2013' + endTime + '</span>'
            + '<span class="note-popup-text">' + escapeHtml(log.note) + '</span>'
            + '</div>';
    });

    const overlay = document.createElement('div');
    overlay.className = 'note-popup-overlay';
    overlay.onclick = closeNotePopup;
    document.body.appendChild(overlay);

    const popup = document.createElement('div');
    popup.className = 'note-popup';
    popup.id = 'notePopup';
    popup.innerHTML = popupHtml;
    document.body.appendChild(popup);

    const rect = event.target.getBoundingClientRect();
    let top = rect.bottom + 6;
    let left = rect.left;

    const popupRect = popup.getBoundingClientRect();
    if (top + popupRect.height > window.innerHeight - 20) {
        top = rect.top - popupRect.height - 6;
    }
    if (left + popupRect.width > window.innerWidth - 20) {
        left = window.innerWidth - popupRect.width - 20;
    }

    popup.style.top = top + 'px';
    popup.style.left = Math.max(10, left) + 'px';
}

export function closeNotePopup() {
    const popup = document.getElementById('notePopup');
    if (popup) popup.remove();
    const overlay = document.querySelector('.note-popup-overlay');
    if (overlay) overlay.remove();
}

export function renderWeeklyOverview() {
    const container = document.getElementById('weeklyTableContainer');
    if (!container) return;

    const fmtW = (ms) => uiState.weeklyDecimal ? formatMsDecimal(ms) : formatMs(ms, false);

    const decBtn = document.getElementById('weeklyDecimalBtn');
    if (decBtn) {
        decBtn.classList.toggle('is-active', !!uiState.weeklyDecimal);
        decBtn.title = uiState.weeklyDecimal ? 'Zeitformat: Dezimal (aktiv) \u2013 klicken f\u00fcr HH:MM' : 'Zeitformat: HH:MM \u2013 klicken f\u00fcr Dezimal';
    }

    const allDates = getWeekDates(uiState.viewWeekStart);
    const todayStr = new Date().toISOString().split('T')[0];
    const weekNum = getISOWeekNumber(allDates[0]);
    const isCurrentWeek = uiState.viewWeekStart === getWeekDates(todayStr)[0];
    const weekLabelEl = document.getElementById('weekLabel');
    weekLabelEl.textContent = 'KW ' + weekNum;
    weekLabelEl.classList.toggle('is-current', isCurrentWeek);

    const wBtn = document.getElementById('weekendToggleBtn');
    if (wBtn) {
        wBtn.classList.toggle('is-active', !!state.settings.showWeekend);
    }

    const allDayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const showWeekend = state.settings.showWeekend !== false;
    const dayIndices = showWeekend ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4];
    const dates = dayIndices.map(i => allDates[i]);
    const dayNames = dayIndices.map(i => allDayNames[i]);

    const activeProjects = state.projects.filter(p => {
        return dates.some(dateStr => calculateNetDurationForDate(p, dateStr) > 0);
    });

    const orderedProjects = [];
    const parentProjects = activeProjects.filter(p => !p.parentId);
    parentProjects.forEach(p => {
        orderedProjects.push(p);
        const children = activeProjects.filter(c => c.parentId === p.id);
        children.forEach(c => orderedProjects.push(c));
    });
    activeProjects.filter(p => p.parentId && !parentProjects.find(pp => pp.id === p.parentId)).forEach(p => orderedProjects.push(p));

    // Wöchentliche Gesamtzeit + Fortschrittsbalken
    let weekTotalMs = 0;
    dates.forEach(dateStr => {
        weekTotalMs += state.projects.reduce((sum, p) => sum + calculateNetDurationForDate(p, dateStr), 0);
    });
    const weeklyTargetHours = (state.settings.workdayHours || 10) * 5;
    const weeklyTargetMs = weeklyTargetHours * 3600000;
    const weekPct = weeklyTargetMs > 0 ? (weekTotalMs / weeklyTargetMs) * 100 : 0;
    const weekTotalStr = fmtW(weekTotalMs);
    const weekTargetStr = fmtW(weeklyTargetMs);

    let html = '<div class="week-summary-bar">'
        + '<div class="week-summary-text">'
        + '<span class="material-symbols-rounded fs-18">date_range</span>'
        + '<span><strong>' + weekTotalStr + '</strong> / ' + weekTargetStr + ' Std</span>'
        + '<span class="week-summary-pct">' + Math.round(weekPct) + '%</span>'
        + '</div>'
        + '<div class="week-summary-progress">'
        + '<div class="week-summary-fill" style="width:' + Math.min(weekPct, 100) + '%;"></div>'
        + '</div>'
        + '</div>';

    html += '<table class="weekly-table"><thead><tr>';
    html += '<th class="weekly-num-col">#</th>';
    html += '<th style="text-align:left;">Projekt</th>';
    dates.forEach((dateStr, i) => {
        const d = new Date(dateStr + 'T12:00:00');
        const isToday = dateStr === todayStr;
        html += '<th class="weekly-day-col ' + (isToday ? 'today-col' : '') + '">' + dayNames[i] + '<br>' + d.getDate() + '.' + (d.getMonth() + 1) + '</th>';
    });
    html += '<th>Summe</th></tr></thead><tbody>';

    const dailyTotals = dates.map((dateStr) =>
        orderedProjects.reduce((sum, p) => sum + calculateNetDurationForDate(p, dateStr), 0)
    );
    const grandTotal = dailyTotals.reduce((a, b) => a + b, 0);

    function renderWeeklyProjectRow(p, isSub) {
        const indent = isSub ? '<span class="op-40" style="margin-right:2px;">\u21b3</span> ' : '';
        const nameStyle = isSub ? 'font-size:12px; opacity:0.85;' : '';
        const hasChildren = !p.parentId && activeProjects.some(c => c.parentId === p.id);
        const isCollapsed = uiState.collapsedWeeklyParents.has(p.id);
        const isMarked = uiState.weeklyMarkedRows.has(p.id);
        const collapseBtn = hasChildren
            ? '<span class="weekly-collapse-btn" onclick="toggleWeeklyCollapse(\'' + p.id + '\')" title="Unterprojekte ' + (isCollapsed ? 'einblenden' : 'ausblenden') + '">'
              + '<span class="material-symbols-rounded fs-14" style="vertical-align:middle;">' + (isCollapsed ? 'expand_more' : 'expand_less') + '</span>'
              + '</span>'
            : '';
        const nameCell = collapseBtn + '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:' + (p.color || '#757575') + '; margin-right:6px; vertical-align:middle;"></span>' + indent + '<span style="' + nameStyle + '">' + p.name + '</span>';

        const rowClass = isMarked ? 'weekly-row-marked' : '';
        html += '<tr class="' + rowClass + '" onclick="toggleWeeklyRowMark(event, \'' + p.id + '\')" style="cursor:pointer;" title="Klicken zum Markieren">';
        const numDisplay = (!isSub && p.number && p.number !== '-') ? p.number : '';
        const fullLabel = (isSub && p.parentId ? (activeProjects.find(x => x.id === p.parentId) || {}).name + ' \u2192 ' + p.name : p.name) + (p.number && p.number !== '-' ? ' (' + p.number + ')' : '');
        html += '<td class="weekly-num-col">' + escapeHtml(numDisplay) + '</td>';
        html += '<td class="project-name-cell" title="' + escapeHtml(fullLabel) + '">' + nameCell + '</td>';
        let rowTotal = 0;
        let displayRowTotal = 0;
        dates.forEach((dateStr, i) => {
            const ms = calculateNetDurationForDate(p, dateStr);
            let displayMs = ms;
            if (hasChildren) {
                activeProjects.filter(c => c.parentId === p.id).forEach(c => {
                    displayMs += calculateNetDurationForDate(c, dateStr);
                });
            }
            const isToday = dateStr === todayStr;
            rowTotal += ms;
            displayRowTotal += displayMs;
            const dayStart = new Date(dateStr + 'T00:00:00').getTime();
            const dayEnd = dayStart + 86400000;
            const dayNotes = (p.logs || []).filter(function(log) {
                const logEnd = log.end || Date.now();
                return logEnd > dayStart && log.start < dayEnd && log.note;
            });
            const noteMarker = dayNotes.length > 0
                ? '<span class="weekly-note-marker" onclick="showNotePopup(event, \'' + p.id + '\', \'' + dateStr + '\')" title="' + dayNotes.length + ' Notiz' + (dayNotes.length > 1 ? 'en' : '') + '">\ud83d\udcdd</span>'
                : '';
            const shownMs = hasChildren ? displayMs : ms;
            html += '<td class="weekly-day-col ' + (isToday ? 'today-col' : '') + '">'
                + (shownMs > 0 ? '<span class="weekly-time-pill' + (hasChildren && displayMs > ms ? ' weekly-time-pill-total' : '') + '">' + fmtW(shownMs) + '</span>' + noteMarker : '<span class="op-20">\u2014</span>')
                + '</td>';
        });
        html += '<td>' + fmtW(hasChildren ? displayRowTotal : rowTotal) + '</td></tr>';
    }

    orderedProjects.forEach(p => {
        const isSub = !!p.parentId;
        if (isSub && p.parentId && uiState.collapsedWeeklyParents.has(p.parentId)) return;
        renderWeeklyProjectRow(p, isSub);
    });

    // Total row
    html += '<tr class="total-row">';
    html += '<td class="weekly-num-col"></td>';
    html += '<td class="project-name-cell">Gesamt</td>';
    dates.forEach((dateStr, i) => {
        const isToday = dateStr === todayStr;
        html += '<td class="' + (isToday ? 'today-col' : '') + '">' + fmtW(dailyTotals[i]) + '</td>';
    });
    html += '<td>' + fmtW(grandTotal) + '</td></tr>';
    html += '</tbody></table>';

    if (orderedProjects.length === 0) {
        html = '<div class="fs-13-variant" style="padding:16px; text-align:center; font-style:italic;">Keine Daten f\u00fcr diese Woche.</div>';
    }

    container.innerHTML = html;
}

// onclick-Handler für inline HTML verfügbar machen
window.navigateWeek = navigateWeek;
window.goToCurrentWeek = goToCurrentWeek;
window.toggleWeekend = toggleWeekend;
window.toggleWeeklyDecimal = toggleWeeklyDecimal;
window.toggleWeeklyCollapse = toggleWeeklyCollapse;
window.toggleWeeklyRowMark = toggleWeeklyRowMark;
window.showNotePopup = showNotePopup;
window.closeNotePopup = closeNotePopup;
