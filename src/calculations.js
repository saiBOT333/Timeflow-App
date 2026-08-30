// =============================================================================
// calculations.js – Zeitberechnungen
// =============================================================================
// Alle Funktionen hier berechnen Netto-Zeiten aus Projektlogs und Pausen.
// Abhängigkeit: state.pauses (aus state.js) – wird direkt importiert.
//
// Nicht enthalten: ...WithChildren-Funktionen (brauchen Projekt-Hierarchie-
// Logik, kommen in Phase 3 nach projects.js).
// =============================================================================

import { state } from './state.js';
import { getLocalDateStr } from './utils.js';

// --- HILFSFUNKTIONEN (pure) ---

/**
 * Millisekunden auf X Minuten aufrunden (0 = exakt)
 */
export function getRoundedMs(ms, roundingMin) {
    if (!roundingMin || roundingMin == 0) return ms;
    const minutes = ms / 60000;
    const roundedMinutes = Math.ceil(minutes / roundingMin) * roundingMin;
    return roundedMinutes * 60000;
}

/**
 * Überlappung zweier Intervalle in Millisekunden
 */
export function getOverlap(start1, end1, start2, end2) {
    const start = Math.max(start1, start2);
    const end = Math.min(end1, end2);
    return Math.max(0, end - start);
}

/**
 * Überlappende Intervalle zusammenführen (sortiert nach start)
 * @param {Array<{start: number, end: number}>} intervals
 */
export function mergeIntervals(intervals) {
    if (intervals.length === 0) return [];
    intervals.sort((a, b) => a.start - b.start);
    const stack = [intervals[0]];
    for (let i = 1; i < intervals.length; i++) {
        const top = stack[stack.length - 1];
        const current = intervals[i];
        if (top.end >= current.start) top.end = Math.max(top.end, current.end);
        else stack.push(current);
    }
    return stack;
}

// --- NETTO-ZEITBERECHNUNGEN ---

/**
 * Gesamte Netto-Arbeitszeit eines Projekts (über alle Tage)
 * Zieht alle globalen Pausen (state.pauses) ab.
 */
export function calculateNetDuration(project) {
    let totalMs = 0;
    const now = Date.now();
    const pauseIntervals = state.pauses.map(p => ({
        start: p.startTs,
        end: p.active ? now : (p.endTs || now)
    }));
    const mergedPauses = mergeIntervals(pauseIntervals);

    project.logs.forEach(log => {
        const logStart = log.start;
        const logEnd = log.end || now;
        if (logEnd <= logStart) return;
        let duration = logEnd - logStart;
        mergedPauses.forEach(pause => {
            duration -= getOverlap(logStart, logEnd, pause.start, pause.end);
        });
        totalMs += Math.max(0, duration);
    });
    return Math.max(0, totalMs);
}

/**
 * Die Pausen eines Tages als zusammengefasste, auf den Tag beschnittene
 * Intervalle. Eine Quelle für alles, was Pausen abzieht oder darstellt –
 * damit Tagessumme und Timeline nie auseinanderlaufen.
 *
 * @param {string} dateStr – "YYYY-MM-DD"
 * @param {number} [now]   – Referenz für laufende Pausen
 * @returns {Array<{start:number,end:number}>} aufsteigend, überlappungsfrei
 */
export function getPauseIntervalsForDate(dateStr, now = Date.now()) {
    const dayStart = new Date(dateStr + 'T00:00:00').getTime();
    const dayEnd = dayStart + 86400000;

    return mergeIntervals(
        state.pauses
            .filter(p => {
                const pEnd = p.active ? now : (p.endTs || now);
                return pEnd > dayStart && p.startTs < dayEnd;
            })
            .map(p => ({
                start: Math.max(p.startTs, dayStart),
                end: Math.min(p.active ? now : (p.endTs || now), dayEnd)
            }))
    );
}

/**
 * Zieht Intervalle aus einem Zeitraum ab und liefert die verbleibenden Stücke.
 * Damit wird ein Zeiteintrag an den Pausen aufgetrennt, die ihn unterbrechen.
 *
 * @param {number} start
 * @param {number} end
 * @param {Array<{start:number,end:number}>} intervals – dürfen sich überlappen
 * @returns {Array<{start:number,end:number}>} leer, wenn nichts übrig bleibt
 */
export function subtractIntervals(start, end, intervals) {
    if (!(end > start)) return [];
    let segments = [{ start, end }];
    mergeIntervals((intervals || []).map(i => ({ start: i.start, end: i.end }))).forEach(cut => {
        const next = [];
        segments.forEach(seg => {
            if (cut.end <= seg.start || cut.start >= seg.end) {
                next.push(seg);
                return;
            }
            if (cut.start > seg.start) next.push({ start: seg.start, end: cut.start });
            if (cut.end < seg.end) next.push({ start: cut.end, end: seg.end });
        });
        segments = next;
    });
    return segments;
}

/**
 * Netto-Arbeitszeit eines Projekts für einen bestimmten Tag
 * @param {object} project
 * @param {string} dateStr – "YYYY-MM-DD"
 */
export function calculateNetDurationForDate(project, dateStr) {
    const dayStart = new Date(dateStr + 'T00:00:00').getTime();
    const dayEnd = dayStart + 86400000;
    const now = Date.now();

    const mergedPauses = getPauseIntervalsForDate(dateStr, now);

    let totalMs = 0;
    (project.logs || []).forEach(log => {
        const logStart = Math.max(log.start, dayStart);
        const logEnd = Math.min(log.end || now, dayEnd);
        if (logEnd <= logStart) return;
        let duration = logEnd - logStart;
        mergedPauses.forEach(pause => {
            duration -= getOverlap(logStart, logEnd, pause.start, pause.end);
        });
        totalMs += Math.max(0, duration);
    });
    return Math.max(0, totalMs);
}

/**
 * Netto-Arbeitszeit eines Projekts für einen Datumsbereich (inklusiv)
 * @param {object} project
 * @param {string} startDateStr – "YYYY-MM-DD"
 * @param {string} endDateStr   – "YYYY-MM-DD"
 */
export function calculateNetDurationForRange(project, startDateStr, endDateStr) {
    let total = 0;
    const start = new Date(startDateStr + 'T12:00:00');
    const end = new Date(endDateStr + 'T12:00:00');
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        total += calculateNetDurationForDate(project, getLocalDateStr(d));
    }
    return total;
}
