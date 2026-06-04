# Design: Backup-Ordner für Feierabend festlegen

**Datum:** 2026-06-03
**Status:** Design abgestimmt

## Ziel

Der Nutzer soll einmalig einen Ordner festlegen können, in den beim Klick auf
"Feierabend" das JSON-Backup automatisch geschrieben wird — ohne bei jedem
Feierabend nachgefragt zu werden. Ist kein Ordner gesetzt oder schlägt das
direkte Schreiben fehl, fällt die App still auf den bisherigen Browser-Download
zurück. Feierabend funktioniert dadurch immer.

## Technische Grundlage & Einschränkungen

- Klassische Browser-Downloads (aktuell `downloadBackup()` in `src/export.js`)
  dürfen aus Sicherheitsgründen keinen festen Pfad vorgeben — die Datei landet
  im Standard-Download-Ordner.
- Einen frei wählbaren Ordner ermöglicht die **File System Access API**
  (`showDirectoryPicker()`), verfügbar **nur in Chromium-Browsern**
  (Chrome, Edge) — nicht in Firefox/Safari.
- Das *Directory Handle* lässt sich nicht in `localStorage`/`state` speichern,
  sondern nur in **IndexedDB** (Handles sind strukturklonbar).
- Chromium verlangt aus Sicherheitsgründen oft einmal pro Sitzung eine erneute
  Bestätigung der Schreib-Berechtigung. Das wird über die Permission-API
  abgefangen; schlägt sie fehl → Download-Fallback.

## Verhalten

### Einstellungen (Tab "Allgemein", unter Export-Prefix)
Neuer Bereich **"Backup-Ordner"**:
- Button **"Ordner wählen…"** → öffnet `showDirectoryPicker()`.
- Anzeige des aktuell gewählten Ordnernamens, sonst
  "Kein Ordner – Backup geht in Downloads".
- **"Entfernen"**-Link → schaltet zurück auf Standard-Download.
- Wird die API nicht unterstützt: Bereich ausgegraut mit Hinweis
  "Nur in Chrome/Edge verfügbar".

### Beim Feierabend
1. Gespeicherten Ordner aus IndexedDB lesen.
2. Ordner vorhanden + beschreibbar → Backup direkt dorthin schreiben (kein Dialog).
3. Kein Ordner / API nicht unterstützt / Schreibfehler → `downloadBackup()`
   (Standard-Download), **still** (nur Konsolen-Warnung, kein Toast/Dialog).

## Architektur

### Neu: `src/backupFolder.js`
Kapselt die gesamte File-System-Access- und IndexedDB-Logik, getrennt von
`state`/`storage`/`export`:

- `isSupported()` → `boolean`: prüft `window.showDirectoryPicker`.
- `pickBackupFolder()` → `Promise<string|null>`: öffnet den Ordner-Dialog,
  speichert das Handle in IndexedDB, gibt den Ordnernamen zurück
  (`null` bei Abbruch).
- `getSavedFolder()` → `Promise<FileSystemDirectoryHandle|null>`: liest das
  Handle aus IndexedDB.
- `getSavedFolderName()` → `Promise<string|null>`: Name für die Settings-Anzeige.
- `clearBackupFolder()` → `Promise<void>`: löscht das gespeicherte Handle.
- `writeBackupToFolder(filename, content)` → `Promise<void>`: prüft/erfragt
  Schreib-Berechtigung (`queryPermission`/`requestPermission`), schreibt die
  Datei via `getFileHandle(..., {create:true})` + `createWritable()`. Wirft bei
  Misserfolg (für den Fallback).

IndexedDB minimal: eine DB mit Object-Store `handles`, ein Eintrag `backupDir`.
Native IndexedDB-API, in diesem Modul gekapselt — kein Framework.

### Integration in `src/quickActions.js`
In `onFeierabend()` wird der Aufruf `downloadBackup()` ersetzt durch eine
asynchrone Hilfe `saveBackup()`:

```
saveBackup()
  ├─ folder = await getSavedFolder()
  ├─ if folder: try writeBackupToFolder(getFileName('json'), JSON.stringify(state))
  │             catch → downloadBackup()   // Fallback
  └─ else: downloadBackup()
```

- `downloadBackup()` in `export.js` bleibt **unverändert** als Fallback.
- Backup-Inhalt (`JSON.stringify(state)`) und Dateiname (`getFileName('json')`)
  identisch zu heute — nur das Schreibziel ändert sich.
- `onFeierabend` ist bereits `async` → `await` fügt sich nahtlos ein.

`saveBackup()` lebt sinnvollerweise in `backupFolder.js` (oder `quickActions.js`),
importiert `downloadBackup` aus `export.js` und `getFileName` aus `export.js`.

### Integration in Einstellungen (`src/settings.js` + `index.html`)
- Neuer Settings-Block in `index.html` (Tab "Allgemein").
- `settings.js`: Funktionen zum Ordner-Wählen/Entfernen und zum Anzeigen des
  Namens beim Öffnen des Modals. Inline-`onclick`-Handler brauchen `window.*`-
  Assignments (Projekt-Konvention).
- Der Ordner-Status lebt **nur** in IndexedDB, **nicht** im `state` — er wird
  also nicht ins JSON-Backup mitexportiert (korrekt: Handle ist gerätespezifisch).

## Fehlerbehandlung

| Situation | Verhalten |
|---|---|
| API nicht unterstützt | Settings-Bereich ausgegraut; Feierabend nutzt Download |
| Nutzer bricht Ordner-Dialog ab (`AbortError`) | Nichts ändert sich, keine Fehlermeldung |
| Schreib-Berechtigung verweigert/abgelaufen | `writeBackupToFolder` wirft → Download-Fallback |
| Ordner gelöscht/verschoben | Schreibfehler → Download-Fallback |

Beim Feierabend-Fallback **kein** Fehler-Dialog/Toast — nur `console.warn`.

## Tests (`tests/backupFolder.test.js`, Vitest)

- `isSupported()` true/false je nach `window.showDirectoryPicker`.
- `saveBackup`-Logik: mit gemocktem Handle → schreibt in Ordner;
  ohne Handle bzw. bei Schreibfehler → ruft `downloadBackup`.
- IndexedDB Get/Set/Clear (gemockter Layer oder `fake-indexeddb`).
- Die native FS-API (`createWritable` etc.) nur über Mocks abgedeckt; echtes
  Schreiben bleibt manuelle Browser-Verifikation (Chrome).
