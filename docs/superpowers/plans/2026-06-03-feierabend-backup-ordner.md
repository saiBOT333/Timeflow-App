# Feierabend-Backup-Ordner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Nutzer legt einmal einen Backup-Ordner fest; beim Feierabend wird das JSON-Backup automatisch dorthin geschrieben, mit stillem Fallback auf den bisherigen Download.

**Architecture:** Neues Modul `src/backupFolder.js` kapselt File System Access API + IndexedDB (Ordner-Handle). Die Orchestrierungs-Funktion `saveBackup(state)` liegt ebenfalls dort und ruft als Fallback das unveränderte `downloadBackup()` aus `export.js`. `quickActions.onFeierabend()` ruft statt `downloadBackup()` nun `await saveBackup(state)`. Die Settings-UI (Tab "Allgemein") bekommt Buttons zum Wählen/Entfernen des Ordners.

**Tech Stack:** Vanilla JS (ES-Module), Vite, Vitest. Test-Hilfe: `fake-indexeddb` (neue devDependency) für IndexedDB in jsdom.

---

## File Structure

- **Create:** `src/backupFolder.js` — IndexedDB-Handle-Verwaltung, File System Access, `saveBackup()`.
- **Create:** `tests/backupFolder.test.js` — Vitest, jsdom + fake-indexeddb.
- **Modify:** `src/quickActions.js` — `onFeierabend()` ruft `saveBackup(state)` statt `downloadBackup()`.
- **Modify:** `index.html` — neuer Settings-Block "Backup-Ordner" im Tab "Allgemein".
- **Modify:** `src/settings.js` — Ordner-Anzeige beim Modal-Öffnen + `window`-Handler zum Wählen/Entfernen.
- **Modify:** `package.json` — `fake-indexeddb` in devDependencies (via npm install).
- **Unchanged (Fallback):** `src/export.js` `downloadBackup()` bleibt wie es ist.

**Hinweis zur Signatur (kleine bewusste Abweichung vom Spec):** `writeBackupToFolder` bekommt das Handle als ersten Parameter (`writeBackupToFolder(handle, filename, content)`) statt es intern zu lesen — das macht die Funktion ohne Zustand testbar und vermeidet einen doppelten IndexedDB-Zugriff in `saveBackup`.

---

## Task 1: Modul-Grundgerüst `backupFolder.js` + `isSupported`

**Files:**
- Create: `src/backupFolder.js`
- Create: `tests/backupFolder.test.js`
- Modify: `package.json` (devDependency)

- [ ] **Step 1: `fake-indexeddb` als devDependency installieren**

Run:
```bash
npm install -D fake-indexeddb
```
Expected: `package.json` listet `fake-indexeddb` unter `devDependencies`; `npm install` läuft fehlerfrei durch.

- [ ] **Step 2: Failing Test für `isSupported` schreiben**

Erstelle `tests/backupFolder.test.js`:
```js
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
```

- [ ] **Step 3: Test ausführen, Fehlschlag bestätigen**

Run: `npm test -- backupFolder`
Expected: FAIL — `Cannot find module '../src/backupFolder.js'` (oder `isSupported is not a function`).

- [ ] **Step 4: `backupFolder.js` mit `isSupported` anlegen**

Erstelle `src/backupFolder.js`:
```js
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
```

- [ ] **Step 5: Test ausführen, Erfolg bestätigen**

Run: `npm test -- backupFolder`
Expected: PASS (2 Tests grün).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/backupFolder.js tests/backupFolder.test.js
git commit -m "feat(backup): backupFolder.js Grundgeruest + isSupported"
```

---

## Task 2: IndexedDB-Helfer + `pickBackupFolder` / `getSavedFolder` / `getSavedFolderName` / `clearBackupFolder`

**Files:**
- Modify: `src/backupFolder.js`
- Modify: `tests/backupFolder.test.js`

- [ ] **Step 1: Failing Tests schreiben**

Ergänze in `tests/backupFolder.test.js` (nach dem `isSupported`-describe-Block, vor dem Datei-Ende). Importiere zusätzlich die neuen Funktionen — ändere die Importzeile:
```js
import {
    isSupported,
    pickBackupFolder,
    getSavedFolderName,
    clearBackupFolder,
} from '../src/backupFolder.js';
```

Füge hinzu:
```js
// Erzeugt ein gefälschtes Directory-Handle mit Berechtigungs-Stubs.
function makeDirHandle(name) {
    return {
        name,
        kind: 'directory',
        queryPermission: vi.fn().mockResolvedValue('granted'),
        requestPermission: vi.fn().mockResolvedValue('granted'),
    };
}

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
```

- [ ] **Step 2: Test ausführen, Fehlschlag bestätigen**

Run: `npm test -- backupFolder`
Expected: FAIL — `pickBackupFolder is not a function` (o. ä.).

- [ ] **Step 3: IndexedDB-Helfer + Funktionen implementieren**

Ergänze in `src/backupFolder.js` (nach `isSupported`):
```js
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
```

- [ ] **Step 4: Test ausführen, Erfolg bestätigen**

Run: `npm test -- backupFolder`
Expected: PASS (alle Tests grün).

- [ ] **Step 5: Commit**

```bash
git add src/backupFolder.js tests/backupFolder.test.js
git commit -m "feat(backup): Ordner waehlen/speichern/entfernen via IndexedDB"
```

---

## Task 3: `writeBackupToFolder`

**Files:**
- Modify: `src/backupFolder.js`
- Modify: `tests/backupFolder.test.js`

- [ ] **Step 1: Failing Tests schreiben**

Erweitere die Importzeile in `tests/backupFolder.test.js` um `writeBackupToFolder`:
```js
import {
    isSupported,
    pickBackupFolder,
    getSavedFolderName,
    clearBackupFolder,
    writeBackupToFolder,
} from '../src/backupFolder.js';
```

Füge einen neuen describe-Block hinzu:
```js
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
```

- [ ] **Step 2: Test ausführen, Fehlschlag bestätigen**

Run: `npm test -- backupFolder`
Expected: FAIL — `writeBackupToFolder is not a function`.

- [ ] **Step 3: Implementieren**

Ergänze in `src/backupFolder.js` (nach `clearBackupFolder`):
```js
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
    await writable.write(content);
    await writable.close();
}
```

- [ ] **Step 4: Test ausführen, Erfolg bestätigen**

Run: `npm test -- backupFolder`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/backupFolder.js tests/backupFolder.test.js
git commit -m "feat(backup): writeBackupToFolder mit Berechtigungspruefung"
```

---

## Task 4: `saveBackup` Orchestrierung (Ordner + Fallback)

**Files:**
- Modify: `src/backupFolder.js`
- Modify: `tests/backupFolder.test.js`

- [ ] **Step 1: Failing Tests schreiben**

Erweitere die Importzeile in `tests/backupFolder.test.js` um `saveBackup` und importiere den gemockten `downloadBackup`:
```js
import {
    isSupported,
    pickBackupFolder,
    getSavedFolderName,
    clearBackupFolder,
    writeBackupToFolder,
    saveBackup,
} from '../src/backupFolder.js';
import { downloadBackup } from '../src/export.js';
```

Füge hinzu:
```js
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
        // Handle in IndexedDB ablegen (über echtes put, da pickBackupFolder
        // nur den Namen zurückgibt). Wir nutzen showDirectoryPicker-Mock.
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
```

- [ ] **Step 2: Test ausführen, Fehlschlag bestätigen**

Run: `npm test -- backupFolder`
Expected: FAIL — `saveBackup is not a function`.

- [ ] **Step 3: Implementieren**

Ergänze in `src/backupFolder.js` (nach `writeBackupToFolder`):
```js
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
    downloadBackup();
}
```

- [ ] **Step 4: Test ausführen, Erfolg bestätigen**

Run: `npm test -- backupFolder`
Expected: PASS (alle Tests grün).

- [ ] **Step 5: Gesamte Suite ausführen**

Run: `npm test`
Expected: Alle bisherigen Tests + neue grün (keine Regression).

- [ ] **Step 6: Commit**

```bash
git add src/backupFolder.js tests/backupFolder.test.js
git commit -m "feat(backup): saveBackup orchestriert Ordner-Schreiben mit Download-Fallback"
```

---

## Task 5: Integration in `onFeierabend`

**Files:**
- Modify: `src/quickActions.js:7` (Import), `src/quickActions.js:37` (Aufruf)

- [ ] **Step 1: Import ergänzen**

In `src/quickActions.js`, Zeile 7, den bestehenden Import ersetzen:
```js
import { downloadBackup } from './export.js';
```
durch:
```js
import { downloadBackup } from './export.js';
import { saveBackup } from './backupFolder.js';
```

- [ ] **Step 2: Aufruf in `onFeierabend` umstellen**

In `src/quickActions.js`, im `onFeierabend`-Block, die Zeile:
```js
        downloadBackup();
```
ersetzen durch:
```js
        await saveBackup(state);
```

(`onFeierabend` ist bereits `async`, `state` ist bereits importiert. `downloadBackup`-Import bleibt — wird nicht mehr direkt hier, aber an anderer Stelle ggf. via `window` genutzt; falls keine andere Nutzung in der Datei besteht, Import dennoch belassen, da `backupFolder.js` ihn intern nutzt — Entfernung hier wäre eine unnötige, nicht angeforderte Änderung. **Prüfen:** Wird `downloadBackup` sonst nirgends in `quickActions.js` verwendet? Falls nein, den jetzt ungenutzten Import aus `quickActions.js` entfernen — das ist ein durch diese Änderung verursachter Orphan.)

- [ ] **Step 3: Verifizieren, dass `downloadBackup`-Import-Status korrekt ist**

Run:
```bash
grep -n "downloadBackup" src/quickActions.js
```
Expected: Wenn nach Step 2 nur noch die Import-Zeile übrig ist (kein Aufruf), die Import-Zeile `import { downloadBackup } from './export.js';` aus `quickActions.js` entfernen. Wenn `downloadBackup` dort weiter aufgerufen wird, Import belassen.

- [ ] **Step 4: Gesamte Suite ausführen**

Run: `npm test`
Expected: Alle Tests grün.

- [ ] **Step 5: Commit**

```bash
git add src/quickActions.js
git commit -m "feat(backup): Feierabend nutzt saveBackup statt direktem Download"
```

---

## Task 6: Settings-UI – HTML-Block

**Files:**
- Modify: `index.html` (Tab "Allgemein", nach der Prefix-`setting-group`, also nach Zeile 57)

- [ ] **Step 1: HTML-Block einfügen**

In `index.html` direkt **nach** dem schließenden `</div>` der Prefix-`setting-group` (nach Zeile 57, vor der Rounding-`setting-group`) einfügen:
```html
                <div class="setting-group" id="backupFolderGroup">
                    <label class="setting-label">Backup-Ordner (Feierabend)</label>
                    <div class="setting-hint mb-8">Beim Feierabend wird das Backup direkt in diesen Ordner geschrieben. Ohne Ordner landet es im Standard-Download-Ordner.</div>
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <button type="button" class="md-btn md-btn-tonal" id="backupFolderPickBtn" onclick="pickBackupFolderSetting()">Ordner wählen…</button>
                        <span id="backupFolderName" class="setting-hint"></span>
                        <button type="button" class="md-btn md-btn-tonal" id="backupFolderClearBtn" onclick="clearBackupFolderSetting()" hidden>Entfernen</button>
                    </div>
                    <div class="setting-hint mb-8" id="backupFolderUnsupported" hidden>Nur in Chrome/Edge verfügbar.</div>
                </div>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat(backup): Settings-UI Block fuer Backup-Ordner"
```

---

## Task 7: Settings-UI – Logik in `settings.js`

**Files:**
- Modify: `src/settings.js` (Import-Block oben; neue Funktionen + `window`-Assigns; Aufruf in `openSettingsModal`)

- [ ] **Step 1: Import ergänzen**

In `src/settings.js`, nach den bestehenden Imports (nach Zeile 5) einfügen:
```js
import { isSupported, pickBackupFolder, getSavedFolderName, clearBackupFolder } from './backupFolder.js';
```

- [ ] **Step 2: Render-Helfer + Handler hinzufügen**

In `src/settings.js` einfügen (z. B. direkt vor `export function saveSettings()`):
```js
// =============================================================================
// BACKUP-ORDNER (Feierabend) – nutzt File System Access API via backupFolder.js
// Status lebt in IndexedDB (nicht in state), Aktionen wirken sofort.
// =============================================================================

async function renderBackupFolderSetting() {
    const group = document.getElementById('backupFolderGroup');
    if (!group) return;
    const nameEl = document.getElementById('backupFolderName');
    const clearBtn = document.getElementById('backupFolderClearBtn');
    const pickBtn = document.getElementById('backupFolderPickBtn');
    const unsupported = document.getElementById('backupFolderUnsupported');

    if (!isSupported()) {
        if (pickBtn) pickBtn.disabled = true;
        if (clearBtn) clearBtn.hidden = true;
        if (unsupported) unsupported.hidden = false;
        if (nameEl) nameEl.textContent = '';
        return;
    }
    if (unsupported) unsupported.hidden = true;
    if (pickBtn) pickBtn.disabled = false;

    const name = await getSavedFolderName();
    if (nameEl) nameEl.textContent = name ? `Ordner: ${escapeHtml(name)}` : 'Kein Ordner – Backup geht in Downloads';
    if (clearBtn) clearBtn.hidden = !name;
}

async function pickBackupFolderSetting() {
    const name = await pickBackupFolder();
    if (name) await renderBackupFolderSetting();
}

async function clearBackupFolderSetting() {
    await clearBackupFolder();
    await renderBackupFolderSetting();
}

window.pickBackupFolderSetting = pickBackupFolderSetting;
window.clearBackupFolderSetting = clearBackupFolderSetting;
```

(`escapeHtml` ist in `settings.js` bereits importiert — siehe Zeile 4. Da `textContent` verwendet wird, ist Escaping streng genommen nicht nötig, schadet aber nicht; falls Linter eine ungenutzte Variable meldet, `escapeHtml` hier einfach weglassen und `name` direkt setzen.)

- [ ] **Step 3: Aufruf beim Modal-Öffnen**

In `src/settings.js`, in `openSettingsModal`, nach `renderExternalLinksSettings();` (Zeile 73) einfügen:
```js
    renderBackupFolderSetting();
```

- [ ] **Step 4: Gesamte Suite ausführen**

Run: `npm test`
Expected: Alle Tests grün (keine Regression; settings.js wird nicht direkt getestet).

- [ ] **Step 5: Commit**

```bash
git add src/settings.js
git commit -m "feat(backup): Settings-Logik fuer Ordner waehlen/entfernen/anzeigen"
```

---

## Task 8: Manuelle Browser-Verifikation (Chrome)

**Files:** keine (nur Verifikation)

- [ ] **Step 1: Dev-Server starten**

Run: `npm run dev` (Vite, Port 5500).

- [ ] **Step 2: Ordner festlegen**

Im Browser (Chrome/Edge): Einstellungen → Tab "Allgemein" → "Ordner wählen…" → einen Test-Ordner wählen + Zugriff erlauben.
Expected: Anzeige zeigt "Ordner: <Name>", "Entfernen"-Button erscheint.

- [ ] **Step 3: Feierabend testen (Ordner-Pfad)**

Auf "Feierabend" klicken, bestätigen.
Expected: Eine `TimeFlow_Export_<Datum>.json` liegt **im gewählten Ordner** (kein Browser-Download). Datei ist valides JSON des States.

- [ ] **Step 4: Fallback testen**

In Einstellungen "Entfernen" klicken, dann erneut Feierabend.
Expected: Backup landet wieder als normaler Browser-Download.

- [ ] **Step 5: Nicht unterstützter Browser (optional, falls Firefox verfügbar)**

In Firefox die Settings öffnen.
Expected: "Ordner wählen…" deaktiviert, Hinweis "Nur in Chrome/Edge verfügbar."; Feierabend nutzt Download.

- [ ] **Step 6: SW-Cache-Version hochziehen (Cache-Invalidierung)**

In `public/sw.js` die `CACHE_VERSION` um eine Patch-Stufe erhöhen (z. B. `timeflow-v3.5.3` → `timeflow-v3.5.4`), damit Nutzer die neue Version laden.
Run: `grep -n "timeflow-v" public/sw.js` zum Verifizieren.

- [ ] **Step 7: Commit**

```bash
git add public/sw.js
git commit -m "chore(pwa): SW-Cache-Version fuer Backup-Ordner-Feature hochgezogen"
```
```
```

---

## Self-Review-Ergebnis

- **Spec-Abdeckung:** Einstellungs-UI (Task 6/7), Ordner wählen/anzeigen/entfernen (Task 2/7), direktes Schreiben beim Feierabend (Task 4/5), stiller Download-Fallback inkl. `console.warn` (Task 4), API-nicht-unterstützt-Hinweis (Task 7), kein State-Export des Handles (Handle nur in IndexedDB, Task 1–2), Tests (Task 1–4). Alle Spec-Punkte abgedeckt.
- **Signatur-Konsistenz:** `saveBackup(state)`, `getSavedFolder()`, `getSavedFolderName()`, `writeBackupToFolder(handle, filename, content)`, `pickBackupFolder()`, `clearBackupFolder()`, `isSupported()` durchgängig identisch in Definition, Tests und Aufrufen verwendet.
- **Platzhalter:** keine offenen TODOs/TBD; jeder Code-Schritt enthält vollständigen Code.
