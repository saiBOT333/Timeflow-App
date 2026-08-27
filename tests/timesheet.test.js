// =============================================================================
// timesheet.test.js – Tests für addManualLog & changeLogProject (Logik-Ebene)
// =============================================================================
// state.projects wird vor jedem Test zurückgesetzt.
// =============================================================================
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { state } from '../src/state.js';
import { commitState, persistState, notifyStateChanged } from '../src/stateManager.js';

// stateManager.commitState würde in JSDOM Events dispatchen → für reine
// Logik-Tests stubbed. storage/render werden nicht getestet.
vi.mock('../src/stateManager.js', () => ({
    commitState: vi.fn(),
    persistState: vi.fn(),
    notifyStateChanged: vi.fn(),
}));
// dialogs.showAlert nutzt DOM → für Logik-Tests neutralisieren.
vi.mock('../src/ui/dialogs.js', () => ({
    showAlert: vi.fn(),
    showConfirm: vi.fn(),
}));
// pauses-Modul (nur für Re-Export auf window) – stubben.
vi.mock('../src/pauses.js', () => ({
    deletePause: vi.fn(),
    deleteAutoPauseFromTimesheet: vi.fn(),
}));
import { addManualLog, changeLogProject, updateTimesheetLogTime } from '../src/ui/timesheet.js';

beforeEach(() => {
    state.projects = [
        { id: 'p1', name: 'Projekt A', color: '#ff0000', logs: [], status: 'idle' },
        { id: 'p2', name: 'Projekt B', color: '#00ff00', logs: [], status: 'idle' },
    ];
});

describe('addManualLog – Happy Path', () => {
    test('legt Log mit korrekten Timestamps und Notiz an', () => {
        const ok = addManualLog('p1', '2026-05-07', '09:30', '11:15', 'Meeting');
        expect(ok).toBe(true);
        expect(state.projects[0].logs).toHaveLength(1);
        const log = state.projects[0].logs[0];
        const expectedStart = new Date('2026-05-07T09:30:00').getTime();
        const expectedEnd = new Date('2026-05-07T11:15:00').getTime();
        expect(log.start).toBe(expectedStart);
        expect(log.end).toBe(expectedEnd);
        expect(log.note).toBe('Meeting');
    });
});

describe('addManualLog – Validierung', () => {
    test('unbekannte Projekt-ID → false, kein Log angelegt', () => {
        const ok = addManualLog('unknown', '2026-05-07', '09:00', '10:00', '');
        expect(ok).toBe(false);
        expect(state.projects[0].logs).toHaveLength(0);
        expect(state.projects[1].logs).toHaveLength(0);
    });

    test('ungültiges Zeitformat (Start) → false', () => {
        const ok = addManualLog('p1', '2026-05-07', '9 Uhr', '10:00', '');
        expect(ok).toBe(false);
        expect(state.projects[0].logs).toHaveLength(0);
    });

    test('ungültiges Zeitformat (Ende) → false', () => {
        const ok = addManualLog('p1', '2026-05-07', '09:00', '25:99', '');
        expect(ok).toBe(false);
        expect(state.projects[0].logs).toHaveLength(0);
    });

    test('Start gleich Ende → false', () => {
        const ok = addManualLog('p1', '2026-05-07', '10:00', '10:00', '');
        expect(ok).toBe(false);
        expect(state.projects[0].logs).toHaveLength(0);
    });

    test('Start nach Ende → false', () => {
        const ok = addManualLog('p1', '2026-05-07', '12:00', '11:00', '');
        expect(ok).toBe(false);
        expect(state.projects[0].logs).toHaveLength(0);
    });

    test('Notiz leer/undefined → log.note ist leerer String', () => {
        addManualLog('p1', '2026-05-07', '09:00', '10:00', undefined);
        expect(state.projects[0].logs[0].note).toBe('');
    });

    test('Notiz wird getrimmt', () => {
        addManualLog('p1', '2026-05-07', '09:00', '10:00', '   Hallo   ');
        expect(state.projects[0].logs[0].note).toBe('Hallo');
    });
});

describe('changeLogProject – abgeschlossener Eintrag', () => {
    beforeEach(() => {
        state.projects[0].logs = [
            { start: 1000, end: 2000, note: 'a' },
            { start: 3000, end: 4000, note: 'b' },
        ];
    });

    test('verschiebt Log korrekt zwischen Projekten', () => {
        const ok = changeLogProject('p1', 0, 'p2');
        expect(ok).toBe(true);
        expect(state.projects[0].logs).toHaveLength(1);
        expect(state.projects[0].logs[0].note).toBe('b');
        expect(state.projects[1].logs).toHaveLength(1);
        expect(state.projects[1].logs[0]).toEqual({ start: 1000, end: 2000, note: 'a' });
    });

    test('Wechsel auf gleiches Projekt: keine Mutation, false', () => {
        const ok = changeLogProject('p1', 0, 'p1');
        expect(ok).toBe(false);
        expect(state.projects[0].logs).toHaveLength(2);
        expect(state.projects[1].logs).toHaveLength(0);
    });

    test('unbekannte Projekt-ID (Quelle) → false', () => {
        const ok = changeLogProject('unknown', 0, 'p2');
        expect(ok).toBe(false);
        expect(state.projects[0].logs).toHaveLength(2);
    });

    test('unbekannte Projekt-ID (Ziel) → false', () => {
        const ok = changeLogProject('p1', 0, 'unknown');
        expect(ok).toBe(false);
        expect(state.projects[0].logs).toHaveLength(2);
    });

    test('ungültiger logIdx → false', () => {
        const ok = changeLogProject('p1', 99, 'p2');
        expect(ok).toBe(false);
        expect(state.projects[0].logs).toHaveLength(2);
    });
});

describe('changeLogProject – laufender Eintrag', () => {
    beforeEach(() => {
        state.projects[0].logs = [
            { start: 1000, end: 2000, note: 'abgeschlossen' },
            { start: 3000, end: null, note: 'laeuft' },
        ];
        state.projects[0].status = 'running';
    });

    test('laufender Eintrag wandert mit Startzeit zum Zielprojekt und laeuft weiter', () => {
        const ok = changeLogProject('p1', 1, 'p2');
        expect(ok).toBe(true);
        expect(state.projects[0].logs).toHaveLength(1);
        expect(state.projects[0].logs[0].note).toBe('abgeschlossen');
        expect(state.projects[1].logs).toEqual([{ start: 3000, end: null, note: 'laeuft' }]);
    });

    test('Status wandert mit: Ziel laeuft, Quelle gestoppt', () => {
        changeLogProject('p1', 1, 'p2');
        expect(state.projects[1].status).toBe('running');
        expect(state.projects[0].status).toBe('stopped');
    });

    test('Quelle bleibt running, wenn dort ein weiterer offener Log existiert', () => {
        state.projects[0].logs.push({ start: 5000, end: null });
        changeLogProject('p1', 1, 'p2');
        expect(state.projects[0].status).toBe('running');
        expect(state.projects[1].status).toBe('running');
    });

    test('Zielprojekt mit bereits offenem Log: zusammengefasst, fruehester Start gewinnt', () => {
        state.projects[1].logs = [{ start: 8000, end: null }];
        changeLogProject('p1', 1, 'p2');
        const open = state.projects[1].logs.filter(l => l.end === null || l.end === undefined);
        expect(open).toHaveLength(1);
        expect(open[0].start).toBe(3000);
        expect(open[0].note).toBe('laeuft');
    });

    test('abgeschlossene Eintraege aendern keinen Status', () => {
        changeLogProject('p1', 0, 'p2');
        expect(state.projects[0].status).toBe('running');
        expect(state.projects[1].status).toBe('idle');
    });
});

describe('updateTimesheetLogTime – Tippen darf nicht unterbrochen werden', () => {
    const D = '2026-05-07';
    const at = (h, m) => new Date(D + 'T' + h + ':' + m + ':00').getTime();
    // Das Re-Render nach blur laeuft in einem setTimeout(0) – hier abwarten.
    const flush = () => new Promise(r => setTimeout(r, 0));

    beforeEach(() => {
        state.projects[0].logs = [{ start: at('09', '00'), end: at('11', '00'), note: 'x' }];
        commitState.mockClear();
        persistState.mockClear();
        notifyStateChanged.mockClear();
    });

    test('live: uebernimmt den Wert ohne Re-Render', async () => {
        updateTimesheetLogTime('p1', 0, 'start', '10:00', D, true);
        expect(state.projects[0].logs[0].start).toBe(at('10', '00'));
        expect(persistState).toHaveBeenCalledTimes(1);
        await flush();
        expect(notifyStateChanged).not.toHaveBeenCalled();
        expect(commitState).not.toHaveBeenCalled();
    });

    test('live: ungueltiger Zwischenstand wird still ignoriert', async () => {
        // Stunde 23 getippt, Ende ist 11:00 → waehrend der Eingabe kein Abbruch
        updateTimesheetLogTime('p1', 0, 'start', '23:00', D, true);
        expect(state.projects[0].logs[0].start).toBe(at('09', '00'));
        expect(persistState).not.toHaveBeenCalled();
        await flush();
        expect(notifyStateChanged).not.toHaveBeenCalled();
    });

    test('live: leeres Feld aendert nichts', () => {
        updateTimesheetLogTime('p1', 0, 'start', '', D, true);
        expect(state.projects[0].logs[0].start).toBe(at('09', '00'));
        expect(persistState).not.toHaveBeenCalled();
    });

    test('blur: uebernimmt den Wert und rendert neu', async () => {
        updateTimesheetLogTime('p1', 0, 'end', '12:30', D, false);
        expect(state.projects[0].logs[0].end).toBe(at('12', '30'));
        expect(persistState).toHaveBeenCalledTimes(1);
        await flush();
        expect(notifyStateChanged).toHaveBeenCalledTimes(1);
    });

    test('blur nach Live-Eingabe: holt das Re-Render nach', async () => {
        updateTimesheetLogTime('p1', 0, 'start', '10:45', D, true);
        await flush();
        expect(notifyStateChanged).not.toHaveBeenCalled();
        // blur meldet denselben Wert – Dauer/Sortierung muessen trotzdem neu
        updateTimesheetLogTime('p1', 0, 'start', '10:45', D, false);
        await flush();
        expect(notifyStateChanged).toHaveBeenCalledTimes(1);
        expect(persistState).toHaveBeenCalledTimes(1);
    });

    test('Segment-Tippen: mehrere change-Events fuehren zur Zielzeit', async () => {
        // Chrome feuert pro fertigem Segment: erst "10:00", dann "10:45"
        updateTimesheetLogTime('p1', 0, 'start', '10:00', D, true);
        updateTimesheetLogTime('p1', 0, 'start', '10:45', D, true);
        updateTimesheetLogTime('p1', 0, 'start', '10:45', D, false);   // blur
        expect(state.projects[0].logs[0].start).toBe(at('10', '45'));
        expect(persistState).toHaveBeenCalledTimes(2);
        await flush();
        expect(notifyStateChanged).toHaveBeenCalledTimes(1);
    });
});
