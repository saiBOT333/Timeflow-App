import { state } from './state.js';
import { incrementTime } from './utils.js';
import { getLocalDateStr } from './ui/autoPauses.js';
import { persistState, commitState } from './stateManager.js';
import { stopAllProjects } from './projects.js';
import { renderPauses } from './ui/pauseList.js';
import { updateTimeBadges } from './ui/timeBadges.js';
import { updateDayProgress } from './ui/progressCard.js';
import { showConfirm } from './ui/dialogs.js';
import { renderActiveProjectCard, checkPauseStatus, isGreetingRunning, setActiveReminder } from './ui/activeCard.js';
import { layoutMasonry } from './ui/masonry.js';

// Modul-Variable: welche Erinnerungen/AutoStop heute schon gefeuert wurden
let firedRemindersToday = {};

// -----------------------------------------------------------------------
// tick – 1s-Taktgeber (Hauptschleife)
// -----------------------------------------------------------------------
export function tick() {
    try {
        const now = Date.now();
        const todayStr = getLocalDateStr();

        if (!state.settings.homeOffice) {
            const autoPauses = state.settings.autoPauses || [];
            autoPauses.forEach(ap => {
                if (!ap.start || !ap.end || !ap.label) return;
                if (ap.activeFrom && todayStr < ap.activeFrom) return;
                const startDt = new Date(todayStr + 'T' + ap.start);
                const endDt = new Date(todayStr + 'T' + ap.end);
                const exists = state.pauses.find(p => p.type === 'auto' && p.startTs === startDt.getTime());
                const skipped = (state.settings.skippedAutoPauses || []).some(s => s.startTs === startDt.getTime());

                if (!exists && !skipped && now >= startDt.getTime()) {
                    state.pauses.push({
                        id: crypto.randomUUID(),
                        startTs: startDt.getTime(),
                        endTs: endDt.getTime(),
                        type: 'auto',
                        label: ap.label,
                        active: false
                    });
                    persistState();
                    renderPauses();
                }
            });
        }

        updateTimeBadges();
        checkPauseStatus();
        checkReminders();
        checkAutoStop();
        updateDayProgress();
    } catch (err) {
        console.error('tick error:', err);
    }
}

// -----------------------------------------------------------------------
// checkAutoStop – stoppt alle Projekte zu konfigurierter Uhrzeit
// -----------------------------------------------------------------------
export function checkAutoStop() {
    const autoStopTime = state.settings.autoStopTime;
    if (!autoStopTime) return;
    const hasRunning = state.projects.some(p => p.status === 'running');
    if (!hasRunning) return;

    const now = new Date();
    const todayDate = now.toISOString().split('T')[0];
    const currentHHMM = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    if (firedRemindersToday._date !== todayDate) {
        firedRemindersToday = { _date: todayDate };
    }

    const autoStopKey = 'autoStop_' + autoStopTime;
    if (firedRemindersToday[autoStopKey]) return;

    if (currentHHMM >= autoStopTime) {
        firedRemindersToday[autoStopKey] = true;
        showConfirm(
            'Automatischer Tagesabschluss um ' + autoStopTime + ' Uhr – alle laufenden Timer jetzt stoppen?',
            { title: 'Tagesabschluss', icon: 'bedtime', okText: 'Stoppen', cancelText: 'Weiter arbeiten' }
        ).then(confirmed => {
            if (confirmed) {
                stopAllProjects();
                commitState();
            }
        });
    }
}

// -----------------------------------------------------------------------
// checkReminders – feuert Erinnerungen
// -----------------------------------------------------------------------
export function checkReminders() {
    const reminders = state.settings.reminders;
    if (!reminders || reminders.length === 0) return;
    const now = new Date();
    const todayDate = now.toISOString().split('T')[0];
    const currentHHMM = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    if (firedRemindersToday._date !== todayDate) {
        firedRemindersToday = { _date: todayDate };
    }

    reminders.forEach((r, idx) => {
        const key = r.time + '-' + r.text;
        if (firedRemindersToday[key]) return;

        if (r.intervalMin && r.intervalMin > 0) {
            const intervalKey = 'interval_' + idx;
            const lastFired = firedRemindersToday[intervalKey] || 0;
            const nowMs = Date.now();
            if (lastFired === 0) {
                if (currentHHMM >= r.time) {
                    firedRemindersToday[intervalKey] = nowMs;
                    setActiveReminder(r.text, idx);
                    if (!isGreetingRunning()) { renderActiveProjectCard(); layoutMasonry(); }
                }
            } else if (nowMs - lastFired >= r.intervalMin * 60000) {
                firedRemindersToday[intervalKey] = nowMs;
                setActiveReminder(r.text, idx);
                if (!isGreetingRunning()) { renderActiveProjectCard(); layoutMasonry(); }
            }
            return;
        }

        if (currentHHMM >= r.time && currentHHMM < incrementTime(r.time, 1)) {
            firedRemindersToday[key] = true;
            setActiveReminder(r.text, idx);
            if (!isGreetingRunning()) {
                renderActiveProjectCard();
                layoutMasonry();
            }
        }
    });
}
