import { downloadBackup, getFileName } from './export.js';

// =============================================================================
// backupFolder.js – Optionaler Backup-Ordner via File System Access API.
// Das Directory-Handle wird in IndexedDB gehalten (nicht in state/localStorage,
// da Handles nur strukturklonbar in IndexedDB persistierbar sind).
// saveBackup() schreibt ins Ordner-Handle oder fällt still auf downloadBackup().
// =============================================================================

const DB_NAME = 'timeflow-backup';
const STORE = 'handles';
const KEY = 'backupDir';

export function isSupported() {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}
