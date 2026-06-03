// @vitest-environment jsdom
// =============================================================================
// backupFolder.test.js – Tests für isSupported, pickBackupFolder,
// getSavedFolderName, clearBackupFolder, saveBackup
// =============================================================================
import 'fake-indexeddb/auto';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// export.js mocken: downloadBackup als Spy, getFileName deterministisch.
vi.mock('../src/export.js', () => ({
    downloadBackup: vi.fn(),
    getFileName: () => 'TimeFlow_Export_2026-06-03.json',
}));

import { isSupported } from '../src/backupFolder.js';

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
