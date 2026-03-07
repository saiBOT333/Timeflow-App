import { state } from '../state.js';
import { formatMs } from '../utils.js';
import { calculateNetDurationForDate } from '../calculations.js';

// =============================================================================
// ui/progressCard.js – Tagesfortschrittsanzeige
// =============================================================================

function getTotalWorkedTodayMs() {
    const todayStr = new Date().toISOString().split('T')[0];
    let total = 0;
    state.projects.forEach(p => {
        total += calculateNetDurationForDate(p, todayStr);
    });
    return total;
}

export function renderProgressCard() {
    const container = document.getElementById('dayProgressContainer');
    if (!container) return;
    if (state.settings.progressEnabled === false) {
        container.innerHTML = '';
        container.hidden = true;
        return;
    }
    container.hidden = false;
    const workedMs = getTotalWorkedTodayMs();
    const workdayMs = (state.settings.workdayHours || 10) * 3600000;
    const pct = (workedMs / workdayMs) * 100;
    const displayPct = Math.min(pct, 100);
    const yellowPct = state.settings.yellowPct || 60;
    const redPct = state.settings.redPct || 85;
    let barClass = 'bar--green';
    if (pct > 100) barClass = 'bar--overtime';
    else if (pct >= redPct) barClass = 'bar--red';
    else if (pct >= yellowPct) barClass = 'bar--yellow';
    const nowTime = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const remainMs = Math.max(0, workdayMs - workedMs);
    const estEndTime = new Date(Date.now() + remainMs).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const workedStr = formatMs(workedMs, false);
    const pctLabel = pct > 100
        ? '<span class="overtime-label">' + Math.round(pct) + '%</span> \u00B7 ' + workedStr + ' \u00B7 \u00DCberstunden!'
        : Math.round(pct) + '% \u00B7 ' + workedStr + ' \u00B7 Feierabend ~' + estEndTime;

    container.innerHTML = '<div class="day-progress-wrap" id="dayProgressWrap">'
        + '<div class="day-progress-header">'
        + '<span class="day-progress-clock">\uD83D\uDD50 ' + nowTime + '</span>'
        + '<span class="day-progress-pct">' + pctLabel + '</span>'
        + '</div>'
        + '<div class="day-progress-bar">'
        + '<div class="day-progress-fill ' + barClass + '" id="dayProgressFill" style="width:' + displayPct + '%;"></div>'
        + '</div>'
        + '</div>';
}

export function updateDayProgress() {
    if (state.settings.progressEnabled === false) return;
    const fill = document.getElementById('dayProgressFill');
    const wrap = document.getElementById('dayProgressWrap');
    if (!fill || !wrap) return;

    const workedMs = getTotalWorkedTodayMs();
    const workdayMs = (state.settings.workdayHours || 10) * 3600000;
    const pct = (workedMs / workdayMs) * 100; // Allow >100%
    const displayPct = Math.min(pct, 100); // Bar width max 100%
    const yellowPct = state.settings.yellowPct || 60;
    const redPct = state.settings.redPct || 85;

    let barClass = 'bar--green';
    if (pct > 100) barClass = 'bar--overtime';
    else if (pct >= redPct) barClass = 'bar--red';
    else if (pct >= yellowPct) barClass = 'bar--yellow';

    fill.style.width = displayPct + '%';
    fill.className = 'day-progress-fill ' + barClass;

    // Estimate end time based on worked time and remaining
    const remainMs = Math.max(0, workdayMs - workedMs);
    const estEndTime = new Date(Date.now() + remainMs).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    // Update clock + percentage text
    const header = wrap.querySelector('.day-progress-header');
    if (header) {
        const nowTime = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const workedStr = formatMs(workedMs, false);
        const pctLabel = pct > 100
            ? `<span class="overtime-label">${Math.round(pct)}%</span> · ${workedStr} · Überstunden!`
            : `${Math.round(pct)}% · ${workedStr} · Feierabend ~${estEndTime}`;
        header.innerHTML = `
            <span class="day-progress-clock">🕐 ${nowTime}</span>
            <span class="day-progress-pct">${pctLabel}</span>
        `;
    }
}
