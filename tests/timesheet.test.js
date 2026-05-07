// =============================================================================
// timesheet.test.js – Tests für addManualLog & changeLogProject (Logik-Ebene)
// =============================================================================
// state.projects wird vor jedem Test zurückgesetzt.
// =============================================================================
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { state } from '../src/state.js';

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

import { addManualLog, changeLogProject } from '../src/ui/timesheet.js';

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
