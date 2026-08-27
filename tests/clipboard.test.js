// @vitest-environment jsdom
// =============================================================================
// clipboard.test.js – Tests für copyText inkl. execCommand-Fallback
// =============================================================================
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { copyText } from '../src/clipboard.js';

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

function setClipboard(value) {
    Object.defineProperty(navigator, 'clipboard', { value, configurable: true, writable: true });
}

beforeEach(() => {
    document.body.innerHTML = '';
});

afterEach(() => {
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
    else setClipboard(undefined);
    delete document.execCommand;
    vi.restoreAllMocks();
});

describe('copyText – moderne Clipboard-API', () => {
    test('schreibt den Text und meldet Erfolg', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        setClipboard({ writeText });

        await expect(copyText('1000')).resolves.toBe(true);
        expect(writeText).toHaveBeenCalledWith('1000');
    });

    test('Zahlen werden als String kopiert', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        setClipboard({ writeText });

        await copyText(4711);
        expect(writeText).toHaveBeenCalledWith('4711');
    });
});

describe('copyText – Fallback ohne Clipboard-API', () => {
    test('nutzt execCommand und raeumt das Hilfsfeld wieder ab', async () => {
        setClipboard(undefined);
        document.execCommand = vi.fn(() => true);

        await expect(copyText('2000')).resolves.toBe(true);
        expect(document.execCommand).toHaveBeenCalledWith('copy');
        expect(document.querySelector('textarea')).toBeNull();
    });

    test('greift, wenn writeText scheitert (z. B. unsicherer Kontext)', async () => {
        setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')) });
        document.execCommand = vi.fn(() => true);

        await expect(copyText('3000')).resolves.toBe(true);
        expect(document.execCommand).toHaveBeenCalled();
    });

    test('meldet false, wenn auch execCommand scheitert', async () => {
        setClipboard(undefined);
        document.execCommand = vi.fn(() => false);

        await expect(copyText('4000')).resolves.toBe(false);
        expect(document.querySelector('textarea')).toBeNull();
    });

    test('wirft nicht, wenn execCommand eine Exception ausloest', async () => {
        setClipboard(undefined);
        document.execCommand = vi.fn(() => { throw new Error('nope'); });

        await expect(copyText('5000')).resolves.toBe(false);
        expect(document.querySelector('textarea')).toBeNull();
    });
});

describe('copyText – leere Eingaben', () => {
    test.each([['', 'leerer String'], [null, 'null'], [undefined, 'undefined']])(
        '%s (%s) kopiert nichts', async (value) => {
            const writeText = vi.fn();
            setClipboard({ writeText });

            await expect(copyText(value)).resolves.toBe(false);
            expect(writeText).not.toHaveBeenCalled();
        }
    );
});
