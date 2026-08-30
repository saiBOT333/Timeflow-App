// =============================================================================
// timeline.js – Tageskette: Einträge sauber ineinander einfügen
// =============================================================================
// Der Stundenzettel bildet einen fortlaufenden Tag ab: Einträge schließen in
// der Regel lückenlos aneinander an. Unterbrochen wird die Kette nur durch
// Pausen oder einen bewusst gestoppten Tag.
//
// Daraus folgen zwei Regeln, die dieses Modul umsetzt:
//
//   1. AUSSCHNEIDEN (carve out)
//      Beansprucht ein Eintrag ein Zeitfenster, weichen alle anderen:
//      angeschnittene werden gekürzt, umschließende geteilt, vollständig
//      überdeckte entfernt. Die Wanduhr bleibt widerspruchsfrei, die
//      Tagessumme ändert sich nur um das, was wirklich umgebucht wurde.
//
//   2. NACHZIEHEN (chain)
//      Wird ein Eintrag kürzer, entsteht eine Lücke. Schloss dort vorher
//      lückenlos ein Nachbar an, zieht dessen Grenze mit – der Tag bleibt
//      geschlossen und das Tagesende stabil. Lag dort schon vorher eine echte
//      Lücke (bewusster Stopp), bleibt sie unangetastet.
//
// Pausen sind Ankerpunkte: sie werden nie verschoben oder ausgeschnitten. Eine
// Pause zwischen zwei Einträgen unterbricht damit automatisch die Kette – der
// Nachbar hinter der Pause zieht nicht mit.
//
// Alle Funktionen sind pur: planX() liest nur und liefert einen Plan,
// applyTimelinePlan() mutiert. Dazwischen kann die UI nachfragen.
// =============================================================================

/** Bis zu dieser Abweichung gelten zwei Einträge als lückenlos aneinander. */
export const CHAIN_TOLERANCE_MS = 60000;

const isRunningLog = (log) => log.end === null || log.end === undefined;
const effectiveEnd = (log, now) => (isRunningLog(log) ? now : log.end);

function emptyCarve() {
    return { removals: [], trims: [], splits: [], isEmpty: true };
}

/**
 * Plant, wie das Fenster [from, to) für einen Eintrag freigeräumt wird.
 *
 * @param {Array} projects        – state.projects
 * @param {number} from           – Beginn des beanspruchten Fensters (ms)
 * @param {number} to             – Ende des beanspruchten Fensters (ms)
 * @param {object} [opts]
 * @param {object} [opts.exceptLog] – Log, das das Fenster beansprucht (bleibt unberührt)
 * @param {number} [opts.now]       – Referenz für laufende Einträge
 * @returns {{removals:Array, trims:Array, splits:Array, isEmpty:boolean}}
 */
export function planCarveOut(projects, from, to, opts = {}) {
    const { exceptLog = null, now = Date.now() } = opts;
    const plan = emptyCarve();
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return plan;

    (projects || []).forEach(project => {
        (project.logs || []).forEach(log => {
            if (log === exceptLog) return;
            const start = log.start;
            const end = effectiveEnd(log, now);
            if (!(end > from && start < to)) return;   // keine Überlappung

            if (isRunningLog(log)) {
                // Ein laufender Eintrag wird nie gelöscht – er läuft hinter dem
                // Fenster weiter, damit der Timer nicht stillschweigend stoppt.
                if (start >= from) {
                    plan.trims.push({ project, log, field: 'start', value: to, oldValue: start });
                } else {
                    plan.splits.push({ project, log, newEnd: from, tailStart: to, tailEnd: null });
                }
                return;
            }

            if (start >= from && end <= to) {
                plan.removals.push({ project, log, start, end });
            } else if (start < from && end > to) {
                plan.splits.push({ project, log, newEnd: from, tailStart: to, tailEnd: end });
            } else if (start < from) {
                plan.trims.push({ project, log, field: 'end', value: from, oldValue: end });
            } else {
                plan.trims.push({ project, log, field: 'start', value: to, oldValue: start });
            }
        });
    });

    plan.isEmpty = plan.removals.length === 0 && plan.trims.length === 0 && plan.splits.length === 0;
    return plan;
}

/**
 * Sucht den Eintrag, der an `boundaryTs` lückenlos anschloss.
 * @param {'after'|'before'} side – 'after': startete dort · 'before': endete dort
 */
export function findChainNeighbour(projects, boundaryTs, side, opts = {}) {
    const { exceptLog = null, tolerance = CHAIN_TOLERANCE_MS } = opts;
    let best = null;
    (projects || []).forEach(project => {
        (project.logs || []).forEach(log => {
            if (log === exceptLog) return;
            // Ein laufender Eintrag hat keine Endgrenze, die nachziehen könnte.
            if (side === 'before' && isRunningLog(log)) return;
            const ts = side === 'after' ? log.start : log.end;
            const diff = Math.abs(ts - boundaryTs);
            if (diff > tolerance) return;
            if (!best || diff < best.diff) best = { project, log, diff };
        });
    });
    return best ? { project: best.project, log: best.log } : null;
}

/**
 * Plant die Folgen einer verschobenen Zeitgrenze.
 *
 * Nach hinten/vorn gewachsen  → das Fenster wird ausgeschnitten (Regel 1).
 * Geschrumpft                 → der lückenlose Nachbar zieht nach (Regel 2).
 *
 * @param {object} log    – der bearbeitete Eintrag
 * @param {'start'|'end'} field
 * @param {number} newTs  – neue Grenze
 * @param {number} oldTs  – Grenze vor der Bearbeitung
 */
export function planBoundaryChange(projects, log, field, newTs, oldTs, opts = {}) {
    const { now = Date.now() } = opts;
    let carve = emptyCarve();
    let chain = null;

    if (field === 'end') {
        if (newTs > oldTs) {
            carve = planCarveOut(projects, oldTs, newTs, { exceptLog: log, now });
        } else if (newTs < oldTs) {
            const n = findChainNeighbour(projects, oldTs, 'after', { exceptLog: log });
            if (n && n.log.start > newTs) {
                chain = { project: n.project, log: n.log, field: 'start', value: newTs, oldValue: n.log.start };
            }
        }
    } else {
        if (newTs < oldTs) {
            carve = planCarveOut(projects, newTs, oldTs, { exceptLog: log, now });
        } else if (newTs > oldTs) {
            const n = findChainNeighbour(projects, oldTs, 'before', { exceptLog: log });
            if (n && n.log.end < newTs) {
                chain = { project: n.project, log: n.log, field: 'end', value: newTs, oldValue: n.log.end };
            }
        }
    }

    return { carve, chain, isEmpty: carve.isEmpty && !chain };
}

/**
 * Plant das Einfügen eines neuen Eintrags in [from, to).
 * Der neue Eintrag selbst wird hier nicht angelegt – nur der Platz geschaffen.
 */
export function planInsert(projects, from, to, opts = {}) {
    const carve = planCarveOut(projects, from, to, opts);
    return { carve, chain: null, isEmpty: carve.isEmpty };
}

/**
 * Wendet einen Plan auf den State an.
 * Reihenfolge: kürzen → teilen → entfernen → Projektstatus nachziehen.
 */
export function applyTimelinePlan(plan) {
    if (!plan) return;
    const carve = plan.carve || emptyCarve();
    const touched = new Set();

    carve.trims.forEach(t => {
        t.log[t.field] = t.value;
        touched.add(t.project);
    });

    carve.splits.forEach(s => {
        const tail = { start: s.tailStart, end: s.tailEnd };
        if (s.log.note) tail.note = s.log.note;
        s.log.end = s.newEnd;
        const idx = s.project.logs.indexOf(s.log);
        s.project.logs.splice(idx === -1 ? s.project.logs.length : idx + 1, 0, tail);
        touched.add(s.project);
    });

    carve.removals.forEach(r => {
        const idx = r.project.logs.indexOf(r.log);
        if (idx !== -1) r.project.logs.splice(idx, 1);
        touched.add(r.project);
    });

    if (plan.chain) {
        plan.chain.log[plan.chain.field] = plan.chain.value;
        touched.add(plan.chain.project);
    }

    // Ein Projekt ohne offenen Eintrag darf nicht mehr als laufend gelten.
    touched.forEach(project => {
        if (project.status === 'running' && !(project.logs || []).some(isRunningLog)) {
            project.status = 'stopped';
        }
    });
}

/**
 * Einträge, die ein Plan vollständig löschen würde – Grundlage der Rückfrage.
 * @param {(ts:number)=>string} formatTime
 * @returns {string[]} z.B. ["Projekt B (10:00–11:00)"]
 */
export function describeRemovals(plan, formatTime) {
    const carve = (plan && plan.carve) || emptyCarve();
    return carve.removals
        .slice()
        .sort((a, b) => a.start - b.start)   // in Tagesreihenfolge lesbar
        .map(r => `${r.project.name} (${formatTime(r.start)}–${formatTime(r.end)})`);
}
