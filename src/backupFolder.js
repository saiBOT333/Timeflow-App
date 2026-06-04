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

export async function pickBackupFolder() {
    if (!isSupported()) return null;
    let handle;
    try {
        handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    } catch (e) {
        if (e && e.name === 'AbortError') return null;
        throw e;
    }
    await idbSet(KEY, handle);
    return handle.name;
}

export async function getSavedFolder() {
    try {
        return await idbGet(KEY);
    } catch {
        // Jeder IndexedDB-Fehler → null, damit saveBackup auf den Download
        // zurückfällt. Bewusst breit: Feierabend darf nie am Backup scheitern.
        return null;
    }
}

export async function getSavedFolderName() {
    const handle = await getSavedFolder();
    return handle ? handle.name : null;
}

export async function clearBackupFolder() {
    try {
        await idbDel(KEY);
    } catch {
        /* nichts zu tun */
    }
}

async function ensureWritePermission(handle) {
    const opts = { mode: 'readwrite' };
    if ((await handle.queryPermission(opts)) === 'granted') return true;
    return (await handle.requestPermission(opts)) === 'granted';
}

export async function writeBackupToFolder(handle, filename, content) {
    if (!(await ensureWritePermission(handle))) {
        throw new Error('Backup-Ordner: Schreibberechtigung verweigert');
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
