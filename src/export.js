import { state, uiState } from './state.js';
import { formatMs, formatMsDecimal, getWeekDates, getISOWeekNumber } from './utils.js';
import { getRoundedMs, calculateNetDurationForDate } from './calculations.js';

// =============================================================================
// export.js – CSV-Export, JSON-Backup, Dateiname
// =============================================================================
// restoreBackup bleibt in app.js (ruft init() auf → Kreisabhängigkeit nicht
// vermeidbar ohne größeren Umbau).
// setupDragAndDrop/getDragAfterElement bleiben in app.js (hängen an layoutMasonry).
// =============================================================================

// --- DATEINAME ---

/**
 * Erzeugt einen Dateinamen aus dem konfigurierten Präfix + aktuellem Datum.
 * @param {string} suffix – Dateiendung ohne Punkt (z. B. "json", "csv")
 */
export function getFileName(suffix) {
    const prefix = state.settings.filePrefix || 'TimeFlow_Export';
    return `${prefix}_${uiState.viewDate || new Date().toISOString().split('T')[0]}.${suffix}`;
}

// --- CSV EXPORT ---

export function downloadCSV() {
    const rounding = parseInt(state.settings.rounding || 0);
    const fmt = ms => uiState.weeklyDecimal ? formatMsDecimal(ms) : formatMs(ms, false);
    const allDates = getWeekDates(uiState.viewWeekStart);
    const showWeekend = state.settings.showWeekend !== false;
    const dayIndices = showWeekend ? [0,1,2,3,4,5,6] : [0,1,2,3,4];
    const allDayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const dates = dayIndices.map(i => allDates[i]);
    const dayNames = dayIndices.map(i => allDayNames[i]);

    // Same active projects + ordering as weekly overview
    const activeProjects = state.projects.filter(p =>
        dates.some(dateStr => calculateNetDurationForDate(p, dateStr) > 0)
    );
    const parentProjects = activeProjects.filter(p => !p.parentId);
    const orderedProjects = [];
    parentProjects.forEach(p => {
        orderedProjects.push(p);
        activeProjects.filter(c => c.parentId === p.id).forEach(c => orderedProjects.push(c));
    });
    activeProjects.filter(p => p.parentId && !parentProjects.find(pp => pp.id === p.parentId)).forEach(p => orderedProjects.push(p));

    // Header row: #; Projekt; Mo dd.mm; Di dd.mm; ...; Gesamt
    const headerDays = dates.map((dateStr, i) => {
        const d = new Date(dateStr + 'T12:00:00');
        return dayNames[i] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '.';
    });
    let csv = '#;Projekt;' + headerDays.join(';') + ';Gesamt\n';

    // Data rows
    orderedProjects.forEach(p => {
        const isSub = !!p.parentId;
        const num = (!isSub && p.number && p.number !== '-') ? p.number : '';
        const parentName = isSub ? ((activeProjects.find(x => x.id === p.parentId) || {}).name || '') : '';
        const name = isSub ? parentName + ' \u2192 ' + p.name : p.name;
        let rowTotal = 0;
        const dayCells = dates.map(dateStr => {
            const rounded = getRoundedMs(calculateNetDurationForDate(p, dateStr), rounding);
            rowTotal += rounded;
            return rounded > 0 ? fmt(rounded) : '';
        });
        csv += '"' + num.replace(/"/g, '""') + '";"' + name.replace(/"/g, '""') + '";'
            + dayCells.map(c => '"' + c + '"').join(';')
            + ';"' + (rowTotal > 0 ? fmt(rowTotal) : '') + '"\n';
    });

    // Total row
    const dailyTotals = dates.map(dateStr =>
        orderedProjects.reduce((sum, p) => sum + getRoundedMs(calculateNetDurationForDate(p, dateStr), rounding), 0)
    );
    const grandTotal = dailyTotals.reduce((a, b) => a + b, 0);
    csv += '"";Gesamt;' + dailyTotals.map(ms => '"' + (ms > 0 ? fmt(ms) : '') + '"').join(';')
        + ';"' + (grandTotal > 0 ? fmt(grandTotal) : '') + '"\n';

    // Filename: Prefix_KW8_2026.csv
    const weekNum = getISOWeekNumber(allDates[0]);
    const year = allDates[0].substring(0, 4);
    const prefix = state.settings.filePrefix || 'TimeFlow_Export';
    const filename = prefix + '_KW' + weekNum + '_' + year + '.csv';

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    link.click();
}

// --- JSON BACKUP ---

export function downloadBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const link = document.createElement('a');
    link.href = dataStr; link.download = getFileName('json'); link.click();
}
