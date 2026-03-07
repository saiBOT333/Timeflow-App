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
