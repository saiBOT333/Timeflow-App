import { state } from './state.js';
import { incrementTime, getLocalDateStr } from './utils.js';
import { persistState, commitState } from './stateManager.js';
import { startProject } from './projects.js';
import { closeOpenDays, readHeartbeat, writeHeartbeat, WAKE_GAP_MS } from './dayRollover.js';
import { showRolloverNotice } from './ui/dayRolloverNotice.js';
import { renderPauses } from './ui/pauseList.js';
import { updateTimeBadges } from './ui/timeBadges.js';
import { updateDayProgress } from './ui/progressCard.js';
import { renderActiveProjectCard, checkPauseStatus, isGreetingRunning, setActiveReminder } from './ui/activeCard.js';
import { layoutMasonry } from './ui/masonry.js';
import { playReminderSound } from './sound.js';

// Modul-Variable: welche Erinnerungen heute schon gefeuert wurden
let firedRemindersToday = {};

// Kalendertag des letzten Ticks – erkennt das Überschreiten der Tagesgrenze
let lastTickDay = getLocalDateStr();

// -----------------------------------------------------------------------
// tick – 1s-Taktgeber (Hauptschleife)
// -----------------------------------------------------------------------
export function tick() {
    try {
        const now = Date.now();
        // Tagesgrenze zuerst: erst danach gilt "heute" für alles Weitere.
        // Liest den Heartbeat, bevor writeHeartbeat() ihn am Tick-Ende fortschreibt.
        checkDayBoundary(now);
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
        updateDayProgress();
        writeHeartbeat(now);
    } catch (err) {
        console.error('tick error:', err);
    }
}

// -----------------------------------------------------------------------
// checkDayBoundary – Tageswechsel zur Laufzeit behandeln
// -----------------------------------------------------------------------
// Zwei Fälle, beide enden hier:
//   1. Der Rechner lief durch (Heartbeat aktuell) → um 00:00 ist Schluss.
//      Offene Logs werden auf 23:59:59 des Vortags geschlossen, es startet
//      nichts neu – der Tag ist zu Ende.
//   2. Der Rechner war im Standby/Ruhezustand (Heartbeat-Lücke) → beim
//      Aufwachen zählt das wie ein PC-Start: der Vortag wird zum letzten
//      Heartbeat abgeschlossen, "Allgemein" startet frisch ab jetzt.
export function checkDayBoundary(now = Date.now()) {
    const todayStr = getLocalDateStr();
    if (todayStr === lastTickDay) return;
    lastTickDay = todayStr;

    const lastActive = readHeartbeat();
    const report = closeOpenDays(now, lastActive);
    if (!report) return;

    const wokeUp = lastActive != null && (now - lastActive) > WAKE_GAP_MS;
    if (wokeUp) startProject('general');
    commitState();
    showRolloverNotice(report, { restarted: wokeUp });
}

// -----------------------------------------------------------------------
// checkReminders – feuert Erinnerungen
// -----------------------------------------------------------------------
export function checkReminders() {
    const reminders = state.settings.reminders;
    if (!reminders || reminders.length === 0) return;
    const now = new Date();
    const todayDate = getLocalDateStr(now);
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
                    if (state.settings.reminderSound !== false) playReminderSound();
                    if (!isGreetingRunning()) { renderActiveProjectCard(); layoutMasonry(); }
                }
            } else if (nowMs - lastFired >= r.intervalMin * 60000) {
                firedRemindersToday[intervalKey] = nowMs;
                setActiveReminder(r.text, idx);
                if (state.settings.reminderSound !== false) playReminderSound();
                if (!isGreetingRunning()) { renderActiveProjectCard(); layoutMasonry(); }
            }
            return;
        }

        if (currentHHMM >= r.time && currentHHMM < incrementTime(r.time, 1)) {
            firedRemindersToday[key] = true;
            setActiveReminder(r.text, idx);
            if (state.settings.reminderSound !== false) playReminderSound();
            if (!isGreetingRunning()) {
                renderActiveProjectCard();
                layoutMasonry();
            }
        }
    });
}
