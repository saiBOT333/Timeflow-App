// @vitest-environment jsdom
// =============================================================================
// backupFolder.test.js – Tests für isSupported, pickBackupFolder,
// getSavedFolderName, clearBackupFolder, saveBackup
// =============================================================================
import 'fake-indexeddb/auto';
import { describe, test, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';

// fake-indexeddb nutzt structuredClone, das vi.fn()-Methoden nicht klonen kann.
// File-System-Handles sind in echten Browsern strukturklonbar (spezieller Typ).
// Im Test-Environment patchen wir structuredClone, damit Funktionen als Referenz
// übernommen werden statt einen DataCloneError zu werfen.
beforeAll(() => {
    const _orig = globalThis.structuredClone;
    globalThis.structuredClone = (val) => {
        try { return _orig(val); } catch { return JSON.parse(JSON.stringify(val, (_k, v) => typeof v === 'function' ? v : v)); }
    };
});

// export.js mocken: downloadBackup als Spy, getFileName deterministisch.
vi.mock('../src/export.js', () => ({
    downloadBackup: vi.fn(),
    getFileName: () => 'TimeFlow_Export_2026-06-03.json',
}));

import {
    isSupported,
    pickBackupFolder,
    getSavedFolderName,
    clearBackupFolder,
} from '../src/backupFolder.js';

// Erzeugt ein gefälschtes Directory-Handle mit Berechtigungs-Stubs.
function makeDirHandle(name) {
    return {
        name,
        kind: 'directory',
        queryPermission: vi.fn().mockResolvedValue('granted'),
        requestPermission: vi.fn().mockResolvedValue('granted'),
    };
}

describe('isSupported', () => {
    afterEach(() => {
        delete window.showDirectoryPicker;
    });

    test('true wenn showDirectoryPicker existiert', () => {
        window.showDirectoryPicker = () => {};
        expect(isSupported()).toBe(true);
    });

    test('false wenn showDirectoryPicker fehlt', () => {
        delete window.showDirectoryPicker;
        expect(isSupported()).toBe(false);
    });
});

describe('pickBackupFolder / getSavedFolderName / clearBackupFolder', () => {
    afterEach(async () => {
        delete window.showDirectoryPicker;
        await clearBackupFolder();
    });

    test('pickBackupFolder speichert Handle und gibt Namen zurück', async () => {
        const handle = makeDirHandle('Backups');
        window.showDirectoryPicker = vi.fn().mockResolvedValue(handle);

        const name = await pickBackupFolder();
        expect(name).toBe('Backups');
        expect(await getSavedFolderName()).toBe('Backups');
    });

    test('pickBackupFolder gibt null bei Abbruch (AbortError)', async () => {
        const err = new Error('abort');
        err.name = 'AbortError';
        window.showDirectoryPicker = vi.fn().mockRejectedValue(err);

        const name = await pickBackupFolder();
        expect(name).toBeNull();
        expect(await getSavedFolderName()).toBeNull();
    });

    test('clearBackupFolder entfernt das gespeicherte Handle', async () => {
        const handle = makeDirHandle('Backups');
        window.showDirectoryPicker = vi.fn().mockResolvedValue(handle);
        await pickBackupFolder();

        await clearBackupFolder();
        expect(await getSavedFolderName()).toBeNull();
    });

    test('getSavedFolderName ist null ohne gespeichertes Handle', async () => {
        expect(await getSavedFolderName()).toBeNull();
    });
});
