import { state } from '../state.js';
import { formatMs } from '../utils.js';
import { calculateNetDuration, calculateNetDurationForDate } from '../calculations.js';
import { isParentProject, getChildProjects } from '../projects.js';

// =============================================================================
// ui/timeBadges.js – Zeit-Badges für Projektliste + aktives Projekt
// =============================================================================

export function calculateNetDurationWithChildren(project) {
    let total = calculateNetDuration(project);
    getChildProjects(project.id).forEach(child => {
        total += calculateNetDuration(child);
    });
    return total;
}

export function calculateNetDurationForDateWithChildren(project, dateStr) {
    let total = calculateNetDurationForDate(project, dateStr);
    getChildProjects(project.id).forEach(child => {
        total += calculateNetDurationForDate(child, dateStr);
    });
    return total;
}

export function updateTimeBadges() {
    const todayStr = new Date().toISOString().split('T')[0];
    const displayProject = state.projects.find(p => p.status === 'running') || state.projects.find(p => p.id === 'general');

    if (displayProject) {
        const todayMs = calculateNetDurationForDate(displayProject, todayStr);
        const activeBadge = document.querySelector('.active-project-time');
        const isPulseMode = state.settings.timerMode === 'pulse';
        if (activeBadge && activeBadge.dataset.pid === displayProject.id) {
            if (!isPulseMode) {
                activeBadge.innerText = formatMs(todayMs, true);
            } else {
                const minuteStr = formatMs(todayMs, false);
                if (activeBadge.dataset.lastMinute !== minuteStr) {
                    activeBadge.innerText = minuteStr;
                    activeBadge.dataset.lastMinute = minuteStr;
                }
            }
            const isRunningNow = displayProject.status === 'running';
            activeBadge.classList.toggle('timer-pulse', isPulseMode && isRunningNow);
        }
        const totalBadge = document.querySelector('.active-project-total');
        if (totalBadge && totalBadge.dataset.pid === displayProject.id) {
            totalBadge.innerText = formatMs(calculateNetDuration(displayProject), false);
        }
        const isRunning = displayProject.status === 'running';
        const icon = isRunning ? '\u25B6' : '\u23F8';
        document.title = `${icon} ${displayProject.name} \u2014 ${formatMs(todayMs, false)} | TimeFlow`;
    } else {
        document.title = 'TimeFlow';
    }

    document.querySelectorAll('.time-chip').forEach(badge => {
        const pid = badge.dataset.pid;
        const project = state.projects.find(p => p.id === pid);
        if (project) {
            const hasKids = isParentProject(pid);
            const dayMs = hasKids
                ? calculateNetDurationForDateWithChildren(project, todayStr)
                : calculateNetDurationForDate(project, todayStr);
            const label = badge.querySelector('.time-chip-label');
            if (label) {
                badge.innerHTML = '<span class="time-chip-label">Heute</span>' + formatMs(dayMs, false);
            } else {
                badge.innerText = formatMs(dayMs, false);
            }
        }
    });

    document.querySelectorAll('.time-chip-total').forEach(badge => {
        const pid = badge.dataset.pid;
        const project = state.projects.find(p => p.id === pid);
        if (project) {
            const hasKids = isParentProject(pid);
            const totalMs = hasKids
                ? calculateNetDurationWithChildren(project)
                : calculateNetDuration(project);
            badge.innerText = totalMs > 0 ? '\u03A3 ' + formatMs(totalMs, false) : '';
        }
    });
}
