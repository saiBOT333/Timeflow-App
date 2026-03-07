// =============================================================================
// undo.test.js – Tests für pushUndo / popUndo / hasUndo (Stack-Logik)
// =============================================================================
// undo.js importiert DOM-abhängige Module (activeCard, render) und setzt
// window.undo = undo. Deshalb jsdom-Environment + vi.mock() für die Imports.
// @vitest-environment jsdom
// =============================================================================
import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mocks MÜSSEN vor dem Import von undo.js stehen (Vitest hoist sie automatisch)
vi.mock('../src/ui/activeCard.js', () => ({
    setFeierabendActive: vi.fn(),
    isFeierabendActive: vi.fn(() => false),
    isGreetingRunning: vi.fn(() => false),
    isGreetingShown: vi.fn(() => false),
    setActiveReminder: vi.fn(),
}));
vi.mock('../src/stateManager.js', () => ({
    persistState: vi.fn(),
    commitState: vi.fn(),
    commitStateImmediate: vi.fn(),
    persistStateImmediate: vi.fn(),
    notifyStateChanged: vi.fn(),
}));
vi.mock('../src/ui/render.js', () => ({
    updateUI: vi.fn(),
}));

import { pushUndo, popUndo, hasUndo } from '../src/undo.js';

// Stack zwischen Tests zurücksetzen: alles per popUndo leeren
beforeEach(() => {
    while (hasUndo()) popUndo();
});

// --- hasUndo ---

describe('hasUndo', () => {
    test('leerer Stack → false', () => {
        expect(hasUndo()).toBe(false);
    });
    test('nach pushUndo → true', () => {
        pushUndo({ type: 'deleteProject', data: [] });
        expect(hasUndo()).toBe(true);
    });
});

// --- pushUndo / popUndo ---

describe('pushUndo + popUndo', () => {
    test('LIFO-Reihenfolge: zuletzt rein, zuerst raus', () => {
        pushUndo({ type: 'deleteProject', data: [{ id: 'p1' }] });
        pushUndo({ type: 'deleteProject', data: [{ id: 'p2' }] });
        expect(popUndo().data[0].id).toBe('p2');
        expect(popUndo().data[0].id).toBe('p1');
    });
    test('nach popUndo() auf leerem Stack → undefined', () => {
        expect(popUndo()).toBeUndefined();
    });
    test('nach popUndo() → hasUndo() korrekt aktualisiert', () => {
        pushUndo({ type: 'deleteProject', data: [] });
        popUndo();
        expect(hasUndo()).toBe(false);
    });
    test('Eintrag enthält korrekte Daten', () => {
        const entry = { type: 'feierabend', data: [{ id: 'p1' }], pauses: [] };
        pushUndo(entry);
        expect(popUndo()).toEqual(entry);
    });
});

// --- Stack-Limit (max. 5) ---

describe('Stack-Limit', () => {
    test('maximal 5 Einträge', () => {
        for (let i = 0; i < 7; i++) {
            pushUndo({ type: 'deleteProject', data: [{ id: `p${i}` }] });
        }
        // Stack darf nur 5 Einträge haben → älteste (p0, p1) wurden verdrängt
        let count = 0;
        while (hasUndo()) {
            popUndo();
            count++;
        }
        expect(count).toBe(5);
    });
    test('ältester Eintrag wird bei Überschreitung verdrängt', () => {
        for (let i = 0; i < 6; i++) {
            pushUndo({ type: 'deleteProject', data: [{ id: `p${i}` }] });
        }
        // Stack: p1..p5 (p0 wurde verdrängt)
        const entries = [];
        while (hasUndo()) entries.push(popUndo());
        const ids = entries.map(e => e.data[0].id);
        expect(ids).not.toContain('p0');
        expect(ids).toContain('p5');
    });
});
