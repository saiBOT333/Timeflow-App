// @vitest-environment jsdom
// =============================================================================
// backupFolder.test.js – Tests für isSupported, pickBackupFolder,
// getSavedFolderName, clearBackupFolder, saveBackup
// =============================================================================
import 'fake-indexeddb/auto';
import { describe, test, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';

// fake-indexeddb nutzt structuredClone, das vi.fn()-Methoden nicht klonen kann.
// File-System-Handles sind in echten Browsern strukturklonbar (spezieller Typ).
// Im Test-Environment patchen wir structuredClone: bei DataCloneError wird ein
// rekursiver Deep-Clone verwendet, der Funktionen als Referenz erhält.
function _cloneKeepFns(val) {
    if (val === null || typeof val !== 'object') return val;
    if (Array.isArray(val)) return val.map(_cloneKeepFns);
    const out = {};
    for (const k of Object.keys(val)) {
        const v = val[k];
        out[k] = typeof v === 'function' ? v : _cloneKeepFns(v);
    }
    return out;
}
beforeAll(() => {
    const _orig = globalThis.structuredClone;
    globalThis.structuredClone = (val) => {
        try { return _orig(val); } catch { return _cloneKeepFns(val); }
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
    getSavedFolder,
    getSavedFolderName,
    clearBackupFolder,
    writeBackupToFolder,
    saveBackup,
} from '../src/backupFolder.js';
import { downloadBackup } from '../src/export.js';

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

    test('Handle-Methoden bleiben nach IDB-Roundtrip erhalten', async () => {
        const handle = makeDirHandle('Backups');
        window.showDirectoryPicker = vi.fn().mockResolvedValue(handle);
        await pickBackupFolder();

        const saved = await getSavedFolder();
        expect(typeof saved.queryPermission).toBe('function');
        expect(typeof saved.requestPermission).toBe('function');
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

// Directory-Handle inkl. createWritable-Kette für Schreibtests.
function makeWritableDirHandle(name, { permission = 'granted' } = {}) {
    const writes = [];
    const writable = {
        write: vi.fn(chunk => { writes.push(chunk); return Promise.resolve(); }),
        close: vi.fn().mockResolvedValue(undefined),
    };
    const fileHandle = {
        createWritable: vi.fn().mockResolvedValue(writable),
    };
    return {
        handle: {
            name,
            kind: 'directory',
            queryPermission: vi.fn().mockResolvedValue(permission),
            requestPermission: vi.fn().mockResolvedValue(permission),
            getFileHandle: vi.fn().mockResolvedValue(fileHandle),
        },
        writes,
        writable,
        fileHandle,
    };
}

describe('writeBackupToFolder', () => {
    test('schreibt Inhalt in neue Datei bei erteilter Berechtigung', async () => {
        const { handle, writes, writable, fileHandle } = makeWritableDirHandle('Backups');
        await writeBackupToFolder(handle, 'b.json', '{"a":1}');

        expect(handle.getFileHandle).toHaveBeenCalledWith('b.json', { create: true });
        expect(fileHandle.createWritable).toHaveBeenCalled();
        expect(writes).toEqual(['{"a":1}']);
        expect(writable.close).toHaveBeenCalled();
    });

    test('wirft wenn Berechtigung verweigert wird', async () => {
        const { handle } = makeWritableDirHandle('Backups', { permission: 'denied' });
        await expect(writeBackupToFolder(handle, 'b.json', '{}')).rejects.toThrow();
    });
});

describe('saveBackup', () => {
    beforeEach(() => {
        downloadBackup.mockClear();
    });
    afterEach(async () => {
        delete window.showDirectoryPicker;
        await clearBackupFolder();
    });

    test('ohne gespeicherten Ordner -> downloadBackup (Fallback)', async () => {
        await saveBackup({ x: 1 });
        expect(downloadBackup).toHaveBeenCalledTimes(1);
    });

    test('mit beschreibbarem Ordner -> schreibt dorthin, kein Download', async () => {
        const writes = [];
        const writable = { write: c => { writes.push(c); return Promise.resolve(); }, close: () => Promise.resolve() };
        const fileHandle = { createWritable: () => Promise.resolve(writable) };
        const handle = {
            name: 'Backups',
            queryPermission: () => Promise.resolve('granted'),
            requestPermission: () => Promise.resolve('granted'),
            getFileHandle: () => Promise.resolve(fileHandle),
        };
        window.showDirectoryPicker = () => Promise.resolve(handle);
        await pickBackupFolder();

        await saveBackup({ x: 2 });

        expect(downloadBackup).not.toHaveBeenCalled();
        expect(writes).toEqual([JSON.stringify({ x: 2 })]);
    });

    test('Schreibfehler -> Fallback auf downloadBackup', async () => {
        const handle = {
            name: 'Backups',
            queryPermission: () => Promise.resolve('granted'),
            requestPermission: () => Promise.resolve('granted'),
            getFileHandle: () => Promise.reject(new Error('weg')),
        };
        window.showDirectoryPicker = () => Promise.resolve(handle);
        await pickBackupFolder();

        await saveBackup({ x: 3 });

        expect(downloadBackup).toHaveBeenCalledTimes(1);
    });
});
