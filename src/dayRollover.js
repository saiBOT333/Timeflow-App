// =============================================================================
// dayRollover.js – Tagesgrenze: offene Zeiten aus Vortagen sauber abschließen
// =============================================================================
// Problem: Wird der Rechner heruntergefahren (oder zugeklappt), ohne vorher
// „Feierabend" zu klicken, bleibt der laufende Log offen (end: null). Am
// nächsten Tag zählt dieser Log einfach weiter – der neue Tag startet mit einer
// Aktivität von gestern und muss manuell korrigiert werden.
//
// Regel: Jeder Tag ist eigenständig. Um 00:00 Uhr ist Schluss.
//   • Beim Start und beim Überschreiten der Tagesgrenze werden alle offenen
//     Logs und aktiven Pausen aus Vortagen geschlossen.
//   • Endzeit = letzter Zeitpunkt, an dem TimeFlow nachweislich lief
//     (Heartbeat), höchstens jedoch 23:59:59 des jeweiligen Tages.
//   • Ohne verwertbaren Heartbeat wird auf 23:59:59 geschätzt und der Eintrag
//     als `estimated` markiert, damit der Hinweis zum Prüfen auffordert.
//
// Der Heartbeat liegt im localStorage (tf_lastActive) und wird von tick()
// im Sekundentakt (gedrosselt auf HEARTBEAT_INTERVAL_MS) fortgeschrieben.
//
// Dieses Modul ist bewusst frei von UI-Abhängigkeiten (der Hinweisdialog liegt
// in ui/dayRolloverNotice.js) und damit isoliert testbar.
// =============================================================================

import { state } from './state.js';
import { getLocalDateStr } from './utils.js';

const HEARTBEAT_KEY = 'tf_lastActive';
const DAY_MS = 86400000;

/** Schreibintervall des Heartbeats – gröber als der 1s-Tick, spart Writes. */
export const HEARTBEAT_INTERVAL_MS = 15000;

/** Ab dieser Lücke im Heartbeat gilt das Gerät als weggewesen (Standby/Ruhezustand). */
export const WAKE_GAP_MS = 5 * 60 * 1000;

let _lastHeartbeatWrite = 0;

// --- HEARTBEAT ---------------------------------------------------------------

/** Letzter bekannter „App lief"-Zeitpunkt (ms) oder null. */
export function readHeartbeat() {
    try {
        const raw = localStorage.getItem(HEARTBEAT_KEY);
        if (!raw) return null;
        const ts = parseInt(raw, 10);
        return Number.isFinite(ts) ? ts : null;
    } catch (e) {
        return null;
    }
}

/**
 * Heartbeat fortschreiben (gedrosselt auf HEARTBEAT_INTERVAL_MS).
 * @param {number} ts
 * @param {{force?: boolean}} opts – force: Drosselung überspringen (App-Start)
 */
export function writeHeartbeat(ts = Date.now(), { force = false } = {}) {
    if (!force && ts - _lastHeartbeatWrite < HEARTBEAT_INTERVAL_MS) return;
    _lastHeartbeatWrite = ts;
    try {
        localStorage.setItem(HEARTBEAT_KEY, String(ts));
    } catch (e) {
        /* localStorage nicht verfügbar (Private Mode) – Rollover fällt dann auf 23:59:59 zurück */
    }
}

// --- TAGESGRENZE -------------------------------------------------------------

/** Beginn des lokalen Kalendertags (00:00:00.000) zu einem Timestamp. */
export function startOfLocalDay(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

/** Ende des lokalen Kalendertags (23:59:59) zu einem Timestamp. */
function endOfLocalDay(ts) {
    return startOfLocalDay(ts) + DAY_MS - 1000;
}

/**
 * Endzeit für einen offenen Eintrag aus einem Vortag.
 * Nutzt den Heartbeat, wenn er plausibel ist (nach dem Start und noch am selben
 * Tag), sonst 23:59:59 des Starttags.
 *
 * @param {number} startTs
 * @param {number|null} lastActiveTs
 * @returns {{ts: number, estimated: boolean}}
 */
export function resolveCloseTs(startTs, lastActiveTs) {
    const dayEnd = endOfLocalDay(startTs);
    if (Number.isFinite(lastActiveTs) && lastActiveTs > startTs && lastActiveTs < dayEnd) {
        return { ts: lastActiveTs, estimated: false };
    }
    return { ts: dayEnd, estimated: true };
}

/**
 * Schließt alle offenen Logs und aktiven Pausen ab, die vor dem heutigen Tag
 * begonnen haben. Mutiert den State, persistiert aber NICHT – das entscheidet
 * der Aufrufer (app.js beim Start, timer.js beim Tageswechsel).
 *
 * Einträge des laufenden Tages bleiben unangetastet: ein Browser-Reload oder
 * ein Neustart mitten am Tag darf die laufende Zeit nicht abschneiden.
 *
 * @param {number} nowTs
 * @param {number|null} lastActiveTs – Heartbeat (Default: aus localStorage)
 * @returns {null | {date: string, dates: string[], entries: Array, pauseCount: number, estimated: boolean}}
 *          null, wenn nichts abzuschließen war.
 */
export function closeOpenDays(nowTs = Date.now(), lastActiveTs = readHeartbeat()) {
    const todayStart = startOfLocalDay(nowTs);
    const entries = [];
    const dates = new Set();
    let pauseCount = 0;
    let estimated = false;

    (state.projects || []).forEach(project => {
        (project.logs || []).forEach(log => {
            if (log.end || !Number.isFinite(log.start) || log.start >= todayStart) return;
            const closed = resolveCloseTs(log.start, lastActiveTs);
            log.end = closed.ts;
            if (closed.estimated) estimated = true;
            dates.add(getLocalDateStr(new Date(log.start)));
            entries.push({
                projectId: project.id,
                projectName: project.name,
                start: log.start,
                end: closed.ts,
                estimated: closed.estimated
            });
        });
        // Ein Projekt „läuft" nur noch, solange es einen offenen Log hat.
        if (project.status === 'running' && !(project.logs || []).some(l => !l.end)) {
            project.status = 'stopped';
        }
    });

    (state.pauses || []).forEach(pause => {
        if (!pause.active || !Number.isFinite(pause.startTs) || pause.startTs >= todayStart) return;
        const closed = resolveCloseTs(pause.startTs, lastActiveTs);
        pause.endTs = closed.ts;
        pause.active = false;
        pauseCount++;
        dates.add(getLocalDateStr(new Date(pause.startTs)));
    });
    if (pauseCount > 0 && !(state.pauses || []).some(p => p.active)) {
        state.manualPauseActive = false;
    }

    if (entries.length === 0 && pauseCount === 0) return null;

    const sortedDates = [...dates].sort();
    return {
        date: sortedDates[sortedDates.length - 1],   // jüngster betroffener Tag
        dates: sortedDates,
        entries,
        pauseCount,
        estimated
    };
}

// --- TEXTAUFBEREITUNG --------------------------------------------------------

function formatClock(ts) {
    return new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatDayLabel(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Hinweistext zum Rollover.
 * @param {object} report – Rückgabe von closeOpenDays()
 * @param {{restarted?: boolean}} opts – restarted: heute läuft die Zeit neu ab jetzt
 */
export function formatRolloverMessage(report, { restarted = true } = {}) {
    const lines = [];
    const dayLabel = formatDayLabel(report.date);

    if (report.entries.length === 1) {
        const e = report.entries[0];
        lines.push(`Am ${dayLabel} wurde kein Feierabend gebucht – „${e.projectName}" lief noch.`);
        lines.push(e.estimated
            ? `Die Aktivität wurde auf ${formatClock(e.end)} Uhr beendet (Tagesende).`
            : `Die Aktivität wurde auf ${formatClock(e.end)} Uhr beendet – das war die letzte Aktivität von TimeFlow.`);
    } else if (report.entries.length > 1) {
        lines.push(`Am ${dayLabel} wurde kein Feierabend gebucht. Diese Aktivitäten liefen noch:`);
        report.entries.forEach(e => lines.push(`• „${e.projectName}" bis ${formatClock(e.end)} Uhr`));
    } else {
        lines.push(`Am ${dayLabel} wurde kein Feierabend gebucht.`);
    }

    if (report.pauseCount > 0) {
        lines.push(report.pauseCount === 1
            ? 'Eine laufende Pause wurde ebenfalls beendet.'
            : `${report.pauseCount} laufende Pausen wurden ebenfalls beendet.`);
    }

    if (report.estimated) {
        lines.push('Die genaue Endzeit ließ sich nicht mehr feststellen – bitte im Stundenzettel prüfen.');
    }

    lines.push(restarted
        ? 'Heute startet die Zeiterfassung wieder bei 0.'
        : 'Der Tag ist abgeschlossen – starte eine Aktivität, wenn du weiterarbeitest.');

    return lines.join('\n');
}
