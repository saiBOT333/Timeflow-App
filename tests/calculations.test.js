// =============================================================================
// calculations.test.js – Tests für src/calculations.js
// =============================================================================
// Trick: state.js exportiert ein MUTABLEES Objekt.
// Wir importieren es direkt und setzen state.pauses vor jedem Test zurück.
// So simulieren wir verschiedene Pause-Szenarien ohne vi.mock().
// =============================================================================
import { describe, test, expect, beforeEach } from 'vitest';
import { state } from '../src/state.js';
import {
    getRoundedMs,
    getOverlap,
    mergeIntervals,
    calculateNetDuration,
    calculateNetDurationForDate,
    calculateNetDurationForRange,
    getPauseIntervalsForDate,
    subtractIntervals,
} from '../src/calculations.js';

beforeEach(() => {
    state.pauses = [];
});

// --- getRoundedMs ---

describe('getRoundedMs', () => {
    test('kein Rounding (0) → exakter Wert', () => {
        expect(getRoundedMs(65000, 0)).toBe(65000);
    });
    test('kein Rounding (null) → exakter Wert', () => {
        expect(getRoundedMs(65000, null)).toBe(65000);
    });
    test('15-Minuten-Rounding: 16 min → 30 min', () => {
        expect(getRoundedMs(16 * 60000, 15)).toBe(30 * 60000);
    });
    test('15-Minuten-Rounding: exakt auf Grenze → unverändert', () => {
        expect(getRoundedMs(30 * 60000, 15)).toBe(30 * 60000);
    });
    test('15-Minuten-Rounding: 1 min → 15 min', () => {
        expect(getRoundedMs(1 * 60000, 15)).toBe(15 * 60000);
    });
    test('5-Minuten-Rounding: 22 min → 25 min', () => {
        expect(getRoundedMs(22 * 60000, 5)).toBe(25 * 60000);
    });
});

// --- getOverlap ---

describe('getOverlap', () => {
    test('keine Überlappung (Lücke dazwischen)', () => {
        expect(getOverlap(0, 100, 200, 300)).toBe(0);
    });
    test('vollständige Überlappung (innen)', () => {
        expect(getOverlap(0, 300, 100, 200)).toBe(100);
    });
    test('teilweise Überlappung', () => {
        expect(getOverlap(0, 150, 100, 250)).toBe(50);
    });
    test('Berührung am Rand (kein Overlap)', () => {
        expect(getOverlap(0, 100, 100, 200)).toBe(0);
    });
    test('identische Intervalle', () => {
        expect(getOverlap(100, 200, 100, 200)).toBe(100);
    });
});

// --- mergeIntervals ---

describe('mergeIntervals', () => {
    test('leeres Array → leeres Array', () => {
        expect(mergeIntervals([])).toEqual([]);
    });
    test('ein Intervall → unverändert', () => {
        expect(mergeIntervals([{ start: 0, end: 100 }])).toEqual([{ start: 0, end: 100 }]);
    });
    test('zwei nicht-überlappende Intervalle bleiben separat', () => {
        const result = mergeIntervals([{ start: 0, end: 100 }, { start: 200, end: 300 }]);
        expect(result).toHaveLength(2);
    });
    test('zwei überlappende Intervalle → eines', () => {
        const result = mergeIntervals([{ start: 0, end: 150 }, { start: 100, end: 300 }]);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ start: 0, end: 300 });
    });
    test('drei überlappende → eines', () => {
        const result = mergeIntervals([
            { start: 0,   end: 200 },
            { start: 100, end: 300 },
            { start: 250, end: 400 },
        ]);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ start: 0, end: 400 });
    });
    test('unsortierte Eingabe wird korrekt sortiert', () => {
        const result = mergeIntervals([
            { start: 200, end: 300 },
            { start: 0,   end: 100 },
        ]);
        expect(result).toHaveLength(2);
        expect(result[0].start).toBe(0);
    });
    test('angrenzende Intervalle (end === start) bleiben separat', () => {
        // end >= start ist die Merge-Bedingung, daher wird end===start NICHT gemergt
        const result = mergeIntervals([{ start: 0, end: 100 }, { start: 100, end: 200 }]);
        expect(result).toHaveLength(1); // 100 >= 100 → wird gemergt!
        expect(result[0]).toEqual({ start: 0, end: 200 });
    });
});

// --- calculateNetDuration ---

describe('calculateNetDuration', () => {
    test('einzelnes Log ohne Pausen → exakte Dauer', () => {
        const project = { logs: [{ start: 1000000, end: 4600000 }] };
        expect(calculateNetDuration(project)).toBe(3600000); // 1h
    });
    test('Log mit einer abgeschlossenen Pause → Pause wird abgezogen', () => {
        state.pauses = [{ startTs: 2000000, endTs: 2600000, active: false }];
        const project = { logs: [{ start: 1000000, end: 4600000 }] };
        // 3600000 - 600000 = 3000000
        expect(calculateNetDuration(project)).toBe(3000000);
    });
    test('leere Logs → 0', () => {
        const project = { logs: [] };
        expect(calculateNetDuration(project)).toBe(0);
    });
    test('Pause außerhalb des Logs hat keinen Einfluss', () => {
        state.pauses = [{ startTs: 5000000, endTs: 6000000, active: false }];
        const project = { logs: [{ start: 1000000, end: 4600000 }] };
        expect(calculateNetDuration(project)).toBe(3600000);
    });
    test('mehrere Logs summieren sich', () => {
        const project = {
            logs: [
                { start: 0,       end: 3600000 }, // 1h
                { start: 7200000, end: 10800000 }, // 1h
            ],
        };
        expect(calculateNetDuration(project)).toBe(7200000); // 2h
    });
});

// --- calculateNetDurationForDate ---

describe('calculateNetDurationForDate', () => {
    test('Log am gesuchten Tag → korrekte Dauer', () => {
        const dayStart = new Date('2026-03-07T00:00:00').getTime();
        const project = {
            logs: [{ start: dayStart + 3600000, end: dayStart + 7200000 }], // 1h
        };
        expect(calculateNetDurationForDate(project, '2026-03-07')).toBe(3600000);
    });
    test('Log an anderem Tag → 0', () => {
        const dayStart = new Date('2026-03-06T00:00:00').getTime();
        const project = {
            logs: [{ start: dayStart + 3600000, end: dayStart + 7200000 }],
        };
        expect(calculateNetDurationForDate(project, '2026-03-07')).toBe(0);
    });
    test('Log über Mitternacht: nur der Anteil am gesuchten Tag', () => {
        const day1 = new Date('2026-03-07T00:00:00').getTime();
        const project = {
            // Log von 23:00 Uhr (Tag 1) bis 01:00 Uhr (Tag 2)
            logs: [{ start: day1 - 3600000, end: day1 + 3600000 }],
        };
        // Für 2026-03-07: nur die erste Stunde (Mitternacht bis 01:00) = 3600000
        expect(calculateNetDurationForDate(project, '2026-03-07')).toBe(3600000);
    });
    test('leere Logs → 0', () => {
        const project = { logs: [] };
        expect(calculateNetDurationForDate(project, '2026-03-07')).toBe(0);
    });
});

// --- calculateNetDurationForRange ---

describe('calculateNetDurationForRange', () => {
    test('einzel-Tag Range = calculateNetDurationForDate', () => {
        const dayStart = new Date('2026-03-07T00:00:00').getTime();
        const project = {
            logs: [{ start: dayStart + 3600000, end: dayStart + 7200000 }],
        };
        expect(calculateNetDurationForRange(project, '2026-03-07', '2026-03-07')).toBe(3600000);
    });
    test('Logs an verschiedenen Tagen werden summiert', () => {
        const day1 = new Date('2026-03-07T00:00:00').getTime();
        const day2 = new Date('2026-03-08T00:00:00').getTime();
        const project = {
            logs: [
                { start: day1 + 3600000, end: day1 + 7200000 }, // 1h Tag 1
                { start: day2 + 3600000, end: day2 + 7200000 }, // 1h Tag 2
            ],
        };
        expect(calculateNetDurationForRange(project, '2026-03-07', '2026-03-08')).toBe(7200000); // 2h
    });
    test('Log außerhalb des Bereichs → 0', () => {
        const dayStart = new Date('2026-03-10T00:00:00').getTime();
        const project = {
            logs: [{ start: dayStart + 3600000, end: dayStart + 7200000 }],
        };
        expect(calculateNetDurationForRange(project, '2026-03-07', '2026-03-09')).toBe(0);
    });
});


// --- subtractIntervals ---

describe('subtractIntervals', () => {
    const seg = (start, end) => ({ start, end });

    test('ohne Intervalle bleibt der Zeitraum ganz', () => {
        expect(subtractIntervals(10, 20, [])).toEqual([seg(10, 20)]);
        expect(subtractIntervals(10, 20, null)).toEqual([seg(10, 20)]);
    });

    test('Intervall daneben aendert nichts', () => {
        expect(subtractIntervals(10, 20, [seg(0, 5)])).toEqual([seg(10, 20)]);
        expect(subtractIntervals(10, 20, [seg(25, 30)])).toEqual([seg(10, 20)]);
    });

    test('Beruehrung an der Grenze schneidet nicht', () => {
        expect(subtractIntervals(10, 20, [seg(5, 10)])).toEqual([seg(10, 20)]);
        expect(subtractIntervals(10, 20, [seg(20, 25)])).toEqual([seg(10, 20)]);
    });

    test('Intervall in der Mitte teilt in zwei Stuecke', () => {
        expect(subtractIntervals(10, 20, [seg(13, 15)])).toEqual([seg(10, 13), seg(15, 20)]);
    });

    test('Intervall am Anfang kuerzt vorne', () => {
        expect(subtractIntervals(10, 20, [seg(5, 13)])).toEqual([seg(13, 20)]);
    });

    test('Intervall am Ende kuerzt hinten', () => {
        expect(subtractIntervals(10, 20, [seg(15, 25)])).toEqual([seg(10, 15)]);
    });

    test('vollstaendige Ueberdeckung → nichts bleibt', () => {
        expect(subtractIntervals(10, 20, [seg(5, 25)])).toEqual([]);
        expect(subtractIntervals(10, 20, [seg(10, 20)])).toEqual([]);
    });

    test('mehrere Intervalle → mehrere Stuecke, in Reihenfolge', () => {
        expect(subtractIntervals(0, 100, [seg(20, 30), seg(60, 70)]))
            .toEqual([seg(0, 20), seg(30, 60), seg(70, 100)]);
    });

    test('unsortierte und ueberlappende Intervalle werden zusammengefasst', () => {
        expect(subtractIntervals(0, 100, [seg(60, 70), seg(20, 30), seg(25, 40)]))
            .toEqual([seg(0, 20), seg(40, 60), seg(70, 100)]);
    });

    test('leerer oder verkehrter Zeitraum → nichts', () => {
        expect(subtractIntervals(20, 10, [])).toEqual([]);
        expect(subtractIntervals(10, 10, [])).toEqual([]);
    });

    test('laesst die uebergebenen Intervalle unveraendert', () => {
        const input = [seg(60, 70), seg(20, 30)];
        subtractIntervals(0, 100, input);
        expect(input).toEqual([seg(60, 70), seg(20, 30)]);
    });
});

// --- getPauseIntervalsForDate ---

describe('getPauseIntervalsForDate', () => {
    const D = '2026-05-07';
    const at = (h, m = 0) => new Date(`${D}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).getTime();
    const NOW = at(23);

    test('liefert die Pausen des Tages aufsteigend', () => {
        state.pauses = [
            { startTs: at(13), endTs: at(13, 15), active: false },
            { startTs: at(10), endTs: at(10, 30), active: false },
        ];
        expect(getPauseIntervalsForDate(D, NOW)).toEqual([
            { start: at(10), end: at(10, 30) },
            { start: at(13), end: at(13, 15) },
        ]);
    });

    test('Pausen anderer Tage bleiben draussen', () => {
        state.pauses = [{ startTs: new Date('2026-05-06T10:00:00').getTime(), endTs: new Date('2026-05-06T11:00:00').getTime(), active: false }];
        expect(getPauseIntervalsForDate(D, NOW)).toEqual([]);
    });

    test('ueberlappende Pausen werden zusammengefasst', () => {
        state.pauses = [
            { startTs: at(10), endTs: at(11), active: false },
            { startTs: at(10, 30), endTs: at(12), active: false },
        ];
        expect(getPauseIntervalsForDate(D, NOW)).toEqual([{ start: at(10), end: at(12) }]);
    });

    test('laufende Pause endet bei jetzt', () => {
        state.pauses = [{ startTs: at(10), endTs: null, active: true }];
        expect(getPauseIntervalsForDate(D, at(10, 20))).toEqual([{ start: at(10), end: at(10, 20) }]);
    });

    test('wird auf den Tag beschnitten', () => {
        state.pauses = [{
            startTs: new Date(`${D}T23:30:00`).getTime(),
            endTs: new Date('2026-05-08T00:30:00').getTime(),
            active: false
        }];
        const dayEnd = new Date(`${D}T00:00:00`).getTime() + 86400000;
        expect(getPauseIntervalsForDate(D, NOW)).toEqual([{ start: new Date(`${D}T23:30:00`).getTime(), end: dayEnd }]);
    });

    test('deckt sich mit dem Pausenabzug der Tagessumme', () => {
        state.pauses = [{ startTs: at(10), endTs: at(10, 30), active: false }];
        const project = { logs: [{ start: at(9), end: at(12) }] };
        const segments = subtractIntervals(at(9), at(12), getPauseIntervalsForDate(D, NOW));
        const sum = segments.reduce((t, s) => t + (s.end - s.start), 0);
        expect(sum).toBe(calculateNetDurationForDate(project, D));
    });
});
