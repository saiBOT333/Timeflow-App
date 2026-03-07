// =============================================================================
// utils.test.js – Tests für src/utils.js (pure Funktionen)
// =============================================================================
import { describe, test, expect } from 'vitest';
import {
    formatMs,
    formatMsDecimal,
    formatTimeInput,
    incrementTime,
    isSameDay,
    hexToRgba,
    getContrastTextColor,
    escapeHtml,
    getWeekDates,
    getISOWeekNumber,
} from '../src/utils.js';

// --- formatMs ---

describe('formatMs', () => {
    test('gibt HH:MM:SS zurück', () => {
        expect(formatMs(3661000)).toBe('01:01:01');
    });
    test('ohne Sekunden', () => {
        expect(formatMs(3661000, false)).toBe('01:01');
    });
    test('0 ms → 00:00:00', () => {
        expect(formatMs(0)).toBe('00:00:00');
    });
    test('59 Sekunden', () => {
        expect(formatMs(59000)).toBe('00:00:59');
    });
    test('mehr als 24 Stunden', () => {
        expect(formatMs(90000000)).toBe('25:00:00');
    });
});

// --- formatMsDecimal ---

describe('formatMsDecimal', () => {
    test('1h → "1,00"', () => {
        expect(formatMsDecimal(3600000)).toBe('1,00');
    });
    test('90 Minuten → "1,50"', () => {
        expect(formatMsDecimal(5400000)).toBe('1,50');
    });
    test('0ms → "0,00"', () => {
        expect(formatMsDecimal(0)).toBe('0,00');
    });
    test('Komma statt Punkt im Ergebnis', () => {
        expect(formatMsDecimal(3600000)).toContain(',');
        expect(formatMsDecimal(3600000)).not.toContain('.');
    });
});

// --- incrementTime ---

describe('incrementTime', () => {
    test('einfache Addition', () => {
        expect(incrementTime('08:00', 30)).toBe('08:30');
    });
    test('Übertrag zur nächsten Stunde', () => {
        expect(incrementTime('08:45', 30)).toBe('09:15');
    });
    test('Wrap bei 24h', () => {
        expect(incrementTime('23:50', 30)).toBe('00:20');
    });
    test('0 Minuten addieren', () => {
        expect(incrementTime('12:30', 0)).toBe('12:30');
    });
});

// --- isSameDay ---

describe('isSameDay', () => {
    test('gleicher Tag, unterschiedliche Uhrzeit', () => {
        expect(isSameDay(new Date('2026-03-07T08:00'), new Date('2026-03-07T18:00'))).toBe(true);
    });
    test('unterschiedliche Tage', () => {
        expect(isSameDay(new Date('2026-03-07T23:59'), new Date('2026-03-08T00:00'))).toBe(false);
    });
    test('unterschiedliche Monate', () => {
        expect(isSameDay(new Date('2026-03-31'), new Date('2026-04-01'))).toBe(false);
    });
});

// --- hexToRgba ---

describe('hexToRgba', () => {
    test('Schwarz mit Alpha 1', () => {
        expect(hexToRgba('#000000', 1)).toBe('rgba(0, 0, 0, 1)');
    });
    test('Weiß mit Alpha 0.5', () => {
        expect(hexToRgba('#ffffff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
    });
    test('Farbe ohne #-Präfix', () => {
        expect(hexToRgba('ff0000', 1)).toBe('rgba(255, 0, 0, 1)');
    });
});

// --- getContrastTextColor ---

describe('getContrastTextColor', () => {
    test('heller Hintergrund → dunkler Text', () => {
        expect(getContrastTextColor('#ffffff')).toBe('#1C1B1F');
    });
    test('dunkler Hintergrund → heller Text', () => {
        expect(getContrastTextColor('#000000')).toBe('#FFFBFE');
    });
    test('leerer Wert → heller Text (Fallback)', () => {
        expect(getContrastTextColor('')).toBe('#FFFBFE');
    });
    test('CSS-Variable → heller Text (Fallback)', () => {
        expect(getContrastTextColor('var(--color)')).toBe('#FFFBFE');
    });
});

// --- escapeHtml ---

describe('escapeHtml', () => {
    test('escapt <script>-Tag', () => {
        expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    });
    test('escapt Anführungszeichen', () => {
        expect(escapeHtml('"test"')).toBe('&quot;test&quot;');
    });
    test('escapt Ampersand', () => {
        expect(escapeHtml('a & b')).toBe('a &amp; b');
    });
    test('normaler Text bleibt unverändert', () => {
        expect(escapeHtml('Hallo Welt')).toBe('Hallo Welt');
    });
});

// --- getWeekDates ---

describe('getWeekDates', () => {
    test('gibt genau 7 Daten zurück', () => {
        expect(getWeekDates('2026-03-07')).toHaveLength(7);
    });
    test('beginnt am Montag', () => {
        const dates = getWeekDates('2026-03-07'); // Samstag in KW10
        expect(dates[0]).toBe('2026-03-02'); // Montag
    });
    test('endet am Sonntag', () => {
        const dates = getWeekDates('2026-03-07');
        expect(dates[6]).toBe('2026-03-08'); // Sonntag
    });
    test('Montag als Eingabe → selbe Woche', () => {
        const dates = getWeekDates('2026-03-02');
        expect(dates[0]).toBe('2026-03-02');
        expect(dates[6]).toBe('2026-03-08');
    });
    test('Sonntag als Eingabe → selbe Woche', () => {
        const dates = getWeekDates('2026-03-08');
        expect(dates[0]).toBe('2026-03-02');
    });
    test('Daten sind aufsteigend sortiert', () => {
        const dates = getWeekDates('2026-03-07');
        for (let i = 1; i < dates.length; i++) {
            expect(dates[i] > dates[i - 1]).toBe(true);
        }
    });
});

// --- getISOWeekNumber ---

describe('getISOWeekNumber', () => {
    test('KW 10 im Jahr 2026', () => {
        expect(getISOWeekNumber('2026-03-02')).toBe(10);
    });
    test('KW 2 im Jahr 2026', () => {
        expect(getISOWeekNumber('2026-01-05')).toBe(2);
    });
    test('Silvester 2026 liegt in KW 53 oder 1', () => {
        // 2026-12-31 ist ein Donnerstag → KW 53
        const kw = getISOWeekNumber('2026-12-31');
        expect(kw === 53 || kw === 1).toBe(true);
    });
    test('KW 1 im Jahr 2026 (1. Januar ist Donnerstag)', () => {
        expect(getISOWeekNumber('2026-01-01')).toBe(1);
    });
});
