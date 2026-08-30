// =============================================================================
// timeline.test.js – Tageskette (pure Logik, kein DOM, kein State-Modul)
// =============================================================================
import { describe, test, expect } from 'vitest';
import {
    planCarveOut,
    planBoundaryChange,
    planInsert,
    applyTimelinePlan,
    findChainNeighbour,
    describeRemovals,
    CHAIN_TOLERANCE_MS,
} from '../src/timeline.js';

const D = '2026-05-07';
const at = (h, m = 0) => new Date(D + 'T' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00').getTime();
const NOW = at(23);   // laufende Eintraege enden fuer die Planung "jetzt"

function projects(spec) {
    return spec.map(([id, name, logs]) => ({ id, name, status: 'stopped', logs }));
}

describe('planCarveOut – Fenster freiraeumen', () => {
    test('kein Ueberlapp → leerer Plan', () => {
        const ps = projects([['p1', 'A', [{ start: at(9), end: at(10) }]]]);
        const plan = planCarveOut(ps, at(11), at(12), { now: NOW });
        expect(plan.isEmpty).toBe(true);
    });

    test('Beruehrung an der Grenze zaehlt nicht als Ueberlapp', () => {
        const ps = projects([['p1', 'A', [{ start: at(9), end: at(10) }]]]);
        expect(planCarveOut(ps, at(10), at(11), { now: NOW }).isEmpty).toBe(true);
        expect(planCarveOut(ps, at(8), at(9), { now: NOW }).isEmpty).toBe(true);
    });

    test('ragt vorne hinein → Ende wird gekuerzt', () => {
        const ps = projects([['p1', 'A', [{ start: at(9), end: at(11) }]]]);
        applyTimelinePlan({ carve: planCarveOut(ps, at(10), at(12), { now: NOW }) });
        expect(ps[0].logs).toEqual([{ start: at(9), end: at(10) }]);
    });

    test('ragt hinten hinein → Start wird gekuerzt', () => {
        const ps = projects([['p1', 'A', [{ start: at(11), end: at(13) }]]]);
        applyTimelinePlan({ carve: planCarveOut(ps, at(10), at(12), { now: NOW }) });
        expect(ps[0].logs).toEqual([{ start: at(12), end: at(13) }]);
    });

    test('umschliesst das Fenster → wird geteilt, Notiz bleibt an beiden Teilen', () => {
        const ps = projects([['p1', 'A', [{ start: at(9), end: at(12), note: 'durchgelaufen' }]]]);
        applyTimelinePlan({ carve: planCarveOut(ps, at(10), at(11), { now: NOW }) });
        expect(ps[0].logs).toEqual([
            { start: at(9), end: at(10), note: 'durchgelaufen' },
            { start: at(11), end: at(12), note: 'durchgelaufen' },
        ]);
    });

    test('vollstaendig ueberdeckt → Loeschung, wird gemeldet', () => {
        const ps = projects([['p1', 'A', [{ start: at(10), end: at(11) }]]]);
        const plan = planCarveOut(ps, at(9), at(12), { now: NOW });
        expect(plan.removals).toHaveLength(1);
        expect(describeRemovals({ carve: plan }, () => 'X')).toEqual(['A (X–X)']);
        applyTimelinePlan({ carve: plan });
        expect(ps[0].logs).toHaveLength(0);
    });

    test('exceptLog bleibt unangetastet', () => {
        const own = { start: at(9), end: at(12) };
        const ps = projects([['p1', 'A', [own]]]);
        expect(planCarveOut(ps, at(10), at(11), { exceptLog: own, now: NOW }).isEmpty).toBe(true);
    });

    test('laufender Eintrag wird nie geloescht – er startet spaeter neu', () => {
        const ps = projects([['p1', 'A', [{ start: at(10), end: null }]]]);
        ps[0].status = 'running';
        applyTimelinePlan({ carve: planCarveOut(ps, at(9), at(12), { now: NOW }) });
        expect(ps[0].logs).toEqual([{ start: at(12), end: null }]);
        expect(ps[0].status).toBe('running');
    });

    test('laufender Eintrag wird geteilt und laeuft hinter dem Fenster weiter', () => {
        const ps = projects([['p1', 'A', [{ start: at(9), end: null }]]]);
        ps[0].status = 'running';
        applyTimelinePlan({ carve: planCarveOut(ps, at(10), at(11), { now: NOW }) });
        expect(ps[0].logs).toEqual([
            { start: at(9), end: at(10) },
            { start: at(11), end: null },
        ]);
        expect(ps[0].status).toBe('running');
    });

    test('Projekt verliert seinen einzigen offenen Eintrag nie – Status bleibt korrekt', () => {
        const ps = projects([['p1', 'A', [{ start: at(9), end: at(10) }, { start: at(10), end: null }]]]);
        ps[0].status = 'running';
        // Nur der abgeschlossene Eintrag wird ueberdeckt
        applyTimelinePlan({ carve: planCarveOut(ps, at(9), at(10), { now: NOW }) });
        expect(ps[0].logs).toEqual([{ start: at(10), end: null }]);
        expect(ps[0].status).toBe('running');
    });

    test('Status faellt auf gestoppt, wenn der letzte offene Eintrag wegfaellt', () => {
        // Kann nur ueber einen abgeschlossenen Eintrag passieren
        const ps = projects([['p1', 'A', [{ start: at(9), end: at(10) }]]]);
        ps[0].status = 'running';
        applyTimelinePlan({ carve: planCarveOut(ps, at(8), at(11), { now: NOW }) });
        expect(ps[0].status).toBe('stopped');
    });

    test('ungueltiges Fenster → leerer Plan', () => {
        const ps = projects([['p1', 'A', [{ start: at(9), end: at(12) }]]]);
        expect(planCarveOut(ps, at(11), at(10), { now: NOW }).isEmpty).toBe(true);
        expect(planCarveOut(ps, at(11), at(11), { now: NOW }).isEmpty).toBe(true);
        expect(planCarveOut(ps, NaN, at(11), { now: NOW }).isEmpty).toBe(true);
    });
});

describe('findChainNeighbour', () => {
    const ps = projects([
        ['p1', 'A', [{ start: at(9), end: at(10) }]],
        ['p2', 'B', [{ start: at(10), end: at(11) }]],
    ]);

    test('findet den Eintrag, der dort startet', () => {
        expect(findChainNeighbour(ps, at(10), 'after').project.id).toBe('p2');
    });

    test('findet den Eintrag, der dort endet', () => {
        expect(findChainNeighbour(ps, at(10), 'before').project.id).toBe('p1');
    });

    test('ausserhalb der Toleranz → keiner', () => {
        expect(findChainNeighbour(ps, at(10) + CHAIN_TOLERANCE_MS + 1, 'after')).toBe(null);
    });

    test('laufender Eintrag hat keine Endgrenze', () => {
        const running = projects([['p3', 'C', [{ start: at(9), end: null }]]]);
        expect(findChainNeighbour(running, at(10), 'before')).toBe(null);
    });
});

describe('planBoundaryChange – Nachbarn nachziehen', () => {
    function twoInARow() {
        return projects([
            ['p1', 'A', [{ start: at(9), end: at(10) }]],
            ['p2', 'B', [{ start: at(10), end: at(11) }]],
        ]);
    }

    test('Ende vorgezogen → Nachfolger startet frueher, Tagesende bleibt', () => {
        const ps = twoInARow();
        const plan = planBoundaryChange(ps, ps[0].logs[0], 'end', at(9, 30), at(10), { now: NOW });
        ps[0].logs[0].end = at(9, 30);
        applyTimelinePlan(plan);
        expect(ps[1].logs[0]).toEqual({ start: at(9, 30), end: at(11) });
    });

    test('Ende verlaengert → Nachfolger wird vorne gekuerzt', () => {
        const ps = twoInARow();
        const plan = planBoundaryChange(ps, ps[0].logs[0], 'end', at(10, 30), at(10), { now: NOW });
        ps[0].logs[0].end = at(10, 30);
        applyTimelinePlan(plan);
        expect(ps[1].logs[0]).toEqual({ start: at(10, 30), end: at(11) });
    });

    test('Start nach hinten → Vorgaenger zieht nach', () => {
        const ps = twoInARow();
        const plan = planBoundaryChange(ps, ps[1].logs[0], 'start', at(10, 15), at(10), { now: NOW });
        ps[1].logs[0].start = at(10, 15);
        applyTimelinePlan(plan);
        expect(ps[0].logs[0]).toEqual({ start: at(9), end: at(10, 15) });
    });

    test('Start nach vorn → Vorgaenger wird hinten gekuerzt', () => {
        const ps = twoInARow();
        const plan = planBoundaryChange(ps, ps[1].logs[0], 'start', at(9, 45), at(10), { now: NOW });
        ps[1].logs[0].start = at(9, 45);
        applyTimelinePlan(plan);
        expect(ps[0].logs[0]).toEqual({ start: at(9), end: at(9, 45) });
    });

    test('echte Luecke wird nicht geschlossen', () => {
        const ps = projects([
            ['p1', 'A', [{ start: at(9), end: at(10) }]],
            ['p2', 'B', [{ start: at(11), end: at(12) }]],   // bewusste Unterbrechung
        ]);
        const plan = planBoundaryChange(ps, ps[0].logs[0], 'end', at(9, 30), at(10), { now: NOW });
        expect(plan.isEmpty).toBe(true);
    });

    test('letzter Eintrag des Tages: kein Nachbar, kein Umbau', () => {
        const ps = projects([['p1', 'A', [{ start: at(9), end: at(10) }]]]);
        expect(planBoundaryChange(ps, ps[0].logs[0], 'end', at(11), at(10), { now: NOW }).isEmpty).toBe(true);
    });

    test('Nachbar wird komplett verschluckt → Loeschung, uebernaechster schliesst an', () => {
        const ps = projects([
            ['p1', 'A', [{ start: at(9), end: at(10) }]],
            ['p2', 'B', [{ start: at(10), end: at(11) }, { start: at(11), end: at(12) }]],
        ]);
        const plan = planBoundaryChange(ps, ps[0].logs[0], 'end', at(11, 30), at(10), { now: NOW });
        expect(plan.carve.removals).toHaveLength(1);
        ps[0].logs[0].end = at(11, 30);
        applyTimelinePlan(plan);
        expect(ps[1].logs).toEqual([{ start: at(11, 30), end: at(12) }]);
    });

    test('unveraenderte Grenze → leerer Plan', () => {
        const ps = twoInARow();
        expect(planBoundaryChange(ps, ps[0].logs[0], 'end', at(10), at(10), { now: NOW }).isEmpty).toBe(true);
    });
});

describe('planInsert', () => {
    test('legt nur den Platz frei, den neuen Eintrag erzeugt der Aufrufer', () => {
        const ps = projects([['p1', 'A', [{ start: at(9), end: at(12) }]]]);
        const plan = planInsert(ps, at(10), at(11), { now: NOW });
        expect(plan.chain).toBe(null);
        applyTimelinePlan(plan);
        expect(ps[0].logs).toHaveLength(2);
    });
});

describe('describeRemovals', () => {
    test('listet Loeschungen in Tagesreihenfolge', () => {
        const ps = projects([
            ['p1', 'B', [{ start: at(10, 30), end: at(11) }]],
            ['p2', 'C', [{ start: at(10), end: at(10, 30) }]],
        ]);
        const plan = planInsert(ps, at(9), at(12), { now: NOW });
        const fmt = (ts) => new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        expect(describeRemovals(plan, fmt)).toEqual(['C (10:00–10:30)', 'B (10:30–11:00)']);
    });

    test('ohne Loeschungen leer', () => {
        expect(describeRemovals({ carve: { removals: [] } }, () => 'X')).toEqual([]);
        expect(describeRemovals(null, () => 'X')).toEqual([]);
    });
});
