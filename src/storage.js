import { state } from './state.js';

// --- STORAGE MANAGER (IndexedDB-Wrapper) ---
// Kapselt alle Datenbankoperationen. Schnittstelle nach außen:
//   StorageManager.init()  → Promise<void>   — DB öffnen + ggf. localStorage migrieren
//   StorageManager.get()   → Promise<object|null>
//   StorageManager.set(v)  → Promise<void>
//
// Intern: IndexedDB "TimeFlowDB", ObjectStore "kv", Key "state".
// Beim ersten Start: Daten aus localStorage('tf_state') werden 1:1 übernommen
// und anschließend aus dem localStorage entfernt (einmalige Migration).
export const StorageManager = (() => {
    const DB_NAME    = 'TimeFlowDB';
    const DB_VERSION = 1;
    const STORE      = 'kv';
    const KEY        = 'state';
    const LS_KEY     = 'tf_state';          // alter localStorage-Schlüssel

    let _db = null;                          // gecachte IDB-Instanz

    /** Öffnet die DB (lazy singleton). Gibt immer dasselbe Promise zurück. */
    function _open() {
        if (_db) return Promise.resolve(_db);
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE);
                }
            };
            req.onsuccess  = (e) => { _db = e.target.result; resolve(_db); };
            req.onerror    = (e) => reject(e.target.error);
        });
    }

    /** Liest den gespeicherten State aus IndexedDB. */
    function get() {
        return _open().then(db => new Promise((resolve, reject) => {
            const tx  = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).get(KEY);
            req.onsuccess = (e) => resolve(e.target.result ?? null);
            req.onerror   = (e) => reject(e.target.error);
        }));
    }

    /** Schreibt den State in IndexedDB. */
    function set(value) {
        return _open().then(db => new Promise((resolve, reject) => {
            const tx  = db.transaction(STORE, 'readwrite');
            const req = tx.objectStore(STORE).put(value, KEY);
            req.onsuccess = () => resolve();
            req.onerror   = (e) => reject(e.target.error);
        }));
    }

    /**
     * Initialisiert die DB und führt einmalig die localStorage→IDB-Migration durch.
     * Danach ist der localStorage-Key 'tf_state' leer (entfernt).
     * Gibt true zurück wenn Daten (aus IDB oder migriertem LS) vorhanden sind.
     */
    async function init() {
        await _open();

        // Prüfen ob noch Daten im alten localStorage liegen
        const lsRaw = localStorage.getItem(LS_KEY);
        if (lsRaw) {
            try {
                const parsed = JSON.parse(lsRaw);
                // Nur migrieren wenn IDB noch leer ist (Schutz vor Überschreiben)
                const existing = await get();
                if (!existing) {
                    await set(parsed);
                    console.info('[Storage] localStorage→IndexedDB Migration abgeschlossen.');
                }
                // localStorage-Eintrag entfernen (unabhängig davon ob wir migriert haben)
                localStorage.removeItem(LS_KEY);
                console.info('[Storage] tf_state aus localStorage entfernt.');
            } catch (e) {
                console.warn('[Storage] Migration fehlgeschlagen:', e);
            }
        }
    }

    return { init, get, set };
})();

// saveData/saveDataImmediate schreiben in IndexedDB (asynchron, fire-and-forget).
// Aufrufer müssen NICHT auf das Promise warten — die UI wird nicht blockiert.
// Das gespeicherte Objekt ist eine tiefe Kopie des state, damit spätere State-Mutationen
// das bereits in die Queue gestellte Objekt nicht mehr verändern.
let saveTimeout = null;

export function saveData() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        const snapshot = JSON.parse(JSON.stringify(state));   // tiefe Kopie
        StorageManager.set(snapshot).catch(err =>
            console.error('[Storage] saveData fehlgeschlagen:', err)
        );
    }, 300);
}

export function saveDataImmediate() {
    clearTimeout(saveTimeout);
    const snapshot = JSON.parse(JSON.stringify(state));       // tiefe Kopie
    StorageManager.set(snapshot).catch(err =>
        console.error('[Storage] saveDataImmediate fehlgeschlagen:', err)
    );
}

export function migrateState(loaded) {
    if (!loaded.version || loaded.version < 2) {
        loaded.version = 2;
        if (!loaded.tags) loaded.tags = [];
        if (!loaded.settings) loaded.settings = {};
        if (!loaded.settings.theme) loaded.settings.theme = 'dark';
        (loaded.projects || []).forEach(p => {
            if (!p.tagIds) p.tagIds = [];
        });
        // Previous default '1' meant "Exakt" but behaved like "Exact".
        if (loaded.settings.rounding === '1') {
            loaded.settings.rounding = '0';
        }
    }
    // Ensure greeting field exists (added in later update)
    if (loaded.settings && loaded.settings.greeting === undefined) {
        loaded.settings.greeting = 'Guten Morgen! Bereit für einen produktiven Tag? 🚀';
    }
    // Ensure new settings fields exist
    if (loaded.settings) {
        if (loaded.settings.progressEnabled === undefined) loaded.settings.progressEnabled = true;
        if (!loaded.settings.workdayHours) loaded.settings.workdayHours = 10;
        if (!loaded.settings.yellowPct) loaded.settings.yellowPct = 60;
        if (!loaded.settings.redPct) loaded.settings.redPct = 85;
        if (!loaded.settings.reminders) loaded.settings.reminders = [];
        if (loaded.settings.showWeekend === undefined) loaded.settings.showWeekend = true;
        if (loaded.settings.homeOffice === undefined) loaded.settings.homeOffice = false;
        if (!Array.isArray(loaded.settings.hiddenCards)) loaded.settings.hiddenCards = [];
        if (loaded.settings.compactMode === undefined) loaded.settings.compactMode = false;
        if (!loaded.settings.externalLinks || loaded.settings.externalLinks.length === 0) {
            loaded.settings.externalLinks = [
                { label: 'Home Office', url: '', icon: 'home_work' },
                { label: 'D365', url: '', icon: 'apartment' }
            ];
        }
    }
    // Ensure parentId exists on all projects and migrate dailyNotes to log.note
    (loaded.projects || []).forEach(p => {
        if (!p.dailyNotes) p.dailyNotes = {};
        if (p.parentId === undefined) p.parentId = null;
        // Migrate dailyNotes to log.note (one-time migration)
        if (p.dailyNotes && Object.keys(p.dailyNotes).length > 0) {
            Object.entries(p.dailyNotes).forEach(([dateStr, noteText]) => {
                if (!noteText) return;
                const dayStart = new Date(dateStr + 'T00:00:00').getTime();
                const dayEnd = dayStart + 86400000;
                // Find the first log entry for this day and attach the note
                const matchingLog = (p.logs || []).find(log => {
                    const logEnd = log.end || Date.now();
                    return logEnd > dayStart && log.start < dayEnd && !log.note;
                });
                if (matchingLog) {
                    matchingLog.note = noteText;
                }
            });
            // Clear dailyNotes after migration
            p.dailyNotes = {};
        }
    });
    // Rename old title if still using old default
    if (loaded.customTitles && loaded.customTitles.title_active === 'Aktuelles Projekt') {
        loaded.customTitles.title_active = 'Aktivitätsbereich';
    }
    // Remove obsolete title_export and title_progress
    if (loaded.customTitles) {
        delete loaded.customTitles.title_export;
        delete loaded.customTitles.title_progress;
    }
    // Remove obsolete card-progress from hiddenCards
    if (loaded.settings && Array.isArray(loaded.settings.hiddenCards)) {
        loaded.settings.hiddenCards = loaded.settings.hiddenCards.filter(id => id !== 'card-progress');
    }
    // Migriere altes tf_order (separater localStorage-Key) nach state.settings.cardLayout.
    // Einmalige Migration: danach wird tf_order gelöscht.
    if (loaded.settings && !Array.isArray(loaded.settings.cardLayout)) {
        const DEFAULT_CARD_LAYOUT = [
            { id: 'card-new',       wide: false },
            { id: 'card-active',    wide: false },
            { id: 'card-favorites', wide: false },
            { id: 'card-others',    wide: false },
            { id: 'card-pauses',    wide: false },
            { id: 'card-weekly',    wide: true  },
            { id: 'card-links',     wide: false },
            { id: 'card-timesheet', wide: true  },
            { id: 'card-archive',   wide: false }
        ];
        try {
            const oldRaw = localStorage.getItem('tf_order');
            if (oldRaw) {
                const oldLayout = JSON.parse(oldRaw);
                if (Array.isArray(oldLayout) && oldLayout.length > 0) {
                    if (typeof oldLayout[0] === 'string') {
                        // Altes Format: nur IDs
                        loaded.settings.cardLayout = oldLayout.map(id => {
                            const def = DEFAULT_CARD_LAYOUT.find(d => d.id === id);
                            return { id, wide: def ? def.wide : false };
                        });
                    } else {
                        // Neues Format: {id, wide}
                        loaded.settings.cardLayout = oldLayout.map(item => ({
                            id: item.id,
                            wide: !!item.wide
                        }));
                    }
                    localStorage.removeItem('tf_order'); // Alten Key aufräumen
                } else {
                    loaded.settings.cardLayout = DEFAULT_CARD_LAYOUT;
                }
            } else {
                loaded.settings.cardLayout = DEFAULT_CARD_LAYOUT;
            }
        } catch (e) {
            loaded.settings.cardLayout = DEFAULT_CARD_LAYOUT;
        }
    }
    return loaded;
}

export async function loadData() {
    // StorageManager.init() führt einmalig die localStorage→IDB-Migration durch
    await StorageManager.init();

    const raw = await StorageManager.get();
    if (raw) {
        const loaded = migrateState(raw);
        state.version = loaded.version || 2;
        state.projects = loaded.projects || [];
        state.pauses = loaded.pauses || [];
        state.tags = loaded.tags || [];

        // --- Cleanup: Doppelte Auto-Pausen entfernen (UTC/lokal Timezone-Bug) ---
        // Ein Bug in tick() konnte in der Stunde nach Mitternacht (lokal) Tausende
        // identischer Auto-Pausen erzeugen. Beim Laden deduplizieren wir state.pauses:
        // Pro Label+Tag+Startzeit nur den ersten Eintrag behalten.
        const _pauseCountBefore = state.pauses.length;
        const _seenPauseKeys = new Set();
        state.pauses = state.pauses.filter(pause => {
            const dayKey = new Date(pause.startTs).toISOString().split('T')[0];
            const key = (pause.label || '') + '|' + (pause.type || '') + '|' + dayKey + '|' + pause.startTs;
            if (_seenPauseKeys.has(key)) return false;
            _seenPauseKeys.add(key);
            return true;
        });
        const _didDedup = state.pauses.length < _pauseCountBefore;

        // --- Cleanup: Verwaiste aktive Pausen aus Vortagen automatisch beenden ---
        // Wenn die App geschlossen wurde während eine manuelle Pause aktiv war,
        // bleibt pause.active = true und pause.endTs = null für immer gesetzt.
        // Solche Pausen tauchen im Stundenzettel für JEDEN Tag auf, da pauseEnd = now.
        const _todayStr = new Date().toISOString().split('T')[0];
        state.pauses.forEach(pause => {
            if (pause.active && pause.startTs) {
                const pauseDay = new Date(pause.startTs).toISOString().split('T')[0];
                if (pauseDay !== _todayStr) {
                    // Pause am Ende des Starttags (23:59:59) automatisch schließen
                    pause.endTs = new Date(pauseDay + 'T23:59:59').getTime();
                    pause.active = false;
                }
            }
        });
        // Sync manualPauseActive mit tatsächlichem Zustand
        if (!state.pauses.some(p => p.active)) {
            state.manualPauseActive = false;
        }
        if (loaded.customTitles) {
            state.customTitles = { ...state.customTitles, ...loaded.customTitles };
        }
        if (loaded.settings) {
            state.settings = { ...state.settings, ...loaded.settings };
        }

        // Bereinigten State sofort in DB persistieren, damit er beim nächsten
        // Start nicht erneut aus dem rohen (duplizierten) Stand geladen wird.
        if (_didDedup) {
            const _cleanSnapshot = JSON.parse(JSON.stringify(state));
            StorageManager.set(_cleanSnapshot).catch(err =>
                console.error('[Storage] Cleanup-Save fehlgeschlagen:', err)
            );
        }
    }
    // applyCardOrder() wird von updateUI() aufgerufen — kein separater Aufruf nötig.
    // loadGridLayout() entfernt: tf_order wurde via migrateState() nach
    // state.settings.cardLayout überführt und der Key gelöscht.
}
