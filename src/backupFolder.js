import { downloadBackup, downloadCSV, buildCSV, getFileName } from './export.js';

// =============================================================================
// backupFolder.js – Optionale Zielordner via File System Access API.
// Zwei unabhängige Ordner: einer für das Feierabend-Backup (JSON), einer für
// den CSV-Export. Die Directory-Handles werden in IndexedDB gehalten (nicht in
// state/localStorage, da Handles nur strukturklonbar in IndexedDB persistierbar
// sind).
// saveBackup() / saveCSV() schreiben ins jeweilige Ordner-Handle oder fallen
// still auf den Browser-Download zurück.
// =============================================================================

const DB_NAME = 'timeflow-backup';
const STORE = 'handles';
const KEY_BACKUP = 'backupDir';
const KEY_CSV = 'csvDir';

export function isSupported() {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function idbGet(key) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
    }));
}

function idbSet(key, val) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(val, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    }));
}

function idbDel(key) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    }));
}

// --- GENERISCHE ORDNER-VERWALTUNG (pro IndexedDB-Key ein Ordner) ---

async function pickFolder(key) {
    if (!isSupported()) return null;
    let handle;
    try {
        handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    } catch (e) {
        if (e && e.name === 'AbortError') return null;
        throw e;
    }
    await idbSet(key, handle);
    return handle.name;
}

async function getFolder(key) {
    try {
        return await idbGet(key);
    } catch {
        // Jeder IndexedDB-Fehler → null, damit auf den Download zurückgefallen
        // wird. Bewusst breit: Feierabend/Export dürfen nie am Ordner scheitern.
        return null;
    }
}

async function getFolderName(key) {
    const handle = await getFolder(key);
    return handle ? handle.name : null;
}

async function clearFolder(key) {
    try {
        await idbDel(key);
    } catch {
        /* nichts zu tun */
    }
}

// --- BACKUP-ORDNER (Feierabend, JSON) ---

export function pickBackupFolder() {
    return pickFolder(KEY_BACKUP);
}

export function getSavedFolder() {
    return getFolder(KEY_BACKUP);
}

export function getSavedFolderName() {
    return getFolderName(KEY_BACKUP);
}

export function clearBackupFolder() {
    return clearFolder(KEY_BACKUP);
}

// --- CSV-ORDNER (Wochen-Export) ---

export function pickCsvFolder() {
    return pickFolder(KEY_CSV);
}

export function getSavedCsvFolder() {
    return getFolder(KEY_CSV);
}

export function getSavedCsvFolderName() {
    return getFolderName(KEY_CSV);
}

export function clearCsvFolder() {
    return clearFolder(KEY_CSV);
}

// --- SCHREIBEN ---

async function ensureWritePermission(handle) {
    const opts = { mode: 'readwrite' };
    if ((await handle.queryPermission(opts)) === 'granted') return true;
    return (await handle.requestPermission(opts)) === 'granted';
}

export async function writeBackupToFolder(handle, filename, content) {
    if (!(await ensureWritePermission(handle))) {
        throw new Error('Ordner: Schreibberechtigung verweigert');
    }
    const fileHandle = await handle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    try {
        await writable.write(content);
        await writable.close();
    } catch (e) {
        if (typeof writable.abort === 'function') { try { await writable.abort(); } catch {} }
        throw e;
    }
}

export async function saveBackup(state) {
    const content = JSON.stringify(state);
    const filename = getFileName('json');
    const handle = await getSavedFolder();
    if (handle) {
        try {
            await writeBackupToFolder(handle, filename, content);
            return;
        } catch (e) {
            console.warn('Backup-Ordner nicht beschreibbar – Fallback auf Download:', e);
        }
    }
    // Fallback: downloadBackup() serialisiert den state-Singleton selbst –
    // korrekt, da saveBackup() ausschliesslich mit genau diesem Singleton
    // aufgerufen wird (siehe quickActions.onFeierabend).
    downloadBackup();
}

/**
 * Schreibt den CSV-Wochenexport in den gewählten CSV-Ordner – ohne Ordner
 * (oder wenn er nicht beschreibbar ist) als normaler Browser-Download.
 * @returns {Promise<{folder: string|null, filename: string}>} folder = Ordnername
 *          bei Direkt-Schreiben, null beim Download-Fallback.
 */
export async function saveCSV() {
    const { filename, content } = buildCSV();
    const handle = await getSavedCsvFolder();
    if (handle) {
        try {
            await writeBackupToFolder(handle, filename, content);
            return { folder: handle.name, filename };
        } catch (e) {
            console.warn('CSV-Ordner nicht beschreibbar – Fallback auf Download:', e);
        }
    }
    downloadCSV();
    return { folder: null, filename };
}
