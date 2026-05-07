# Timesheet: Projekt-Wechsel und manueller Eintrag

**Datum:** 2026-05-07
**Status:** Design – freigegeben, bereit für Implementierungs-Plan

## Problem

Im Timesheet (`src/ui/timesheet.js`) kann man bisher nur Start-/Endzeit eines bestehenden Eintrags ändern, eine Notiz setzen oder einen Eintrag löschen. Wenn das Tracking lückenhaft war, fehlen zwei wichtige Korrekturmöglichkeiten:

1. **Projekt eines bestehenden Eintrags wechseln** (z. B. wenn vergessen wurde zu switchen).
2. **Neuen Eintrag manuell nachtragen** (z. B. Termin oder Telefonat, das nicht getrackt wurde).

## Scope

- Projekt-Wechsel für bestehende Einträge (abgeschlossen + laufend).
- Manuelles Anlegen abgeschlossener Einträge (Start + Ende verpflichtend; keine laufenden Einträge per Manual-Form – dafür gibt es bereits den normalen Start-Button).
- Pausen-Einträge sind **nicht** Teil des Scopes (kein Projekt-Wechsel; Löschen existiert bereits).

## UX

### Funktion A – Projekt eines Eintrags wechseln

- Der Projektname (`.ts-entry-project`) wird klickbar (Cursor-Pointer, Hover-Effekt, kleiner Chevron-Icon daneben).
- Klick öffnet ein Dropdown direkt unter dem Eintrag mit allen aktiven (nicht archivierten) Projekten:
  - Jeweils mit Farbpunkt (`project.color`).
  - Sub-Projekte als „Parent → Child".
- Klick auf Eintrag wechselt das Projekt und schließt das Dropdown.
- Klick außerhalb / Esc schließt das Dropdown ohne Änderung.

### Funktion B – Manuell neuen Eintrag hinzufügen

- Direkt unter der Tagessumme (`.ts-day-summary`) ein Button **„+ Eintrag hinzufügen"**.
- Klick blendet darunter eine kompakte Inline-Formularzeile ein:

  ```
  [Projekt-Dropdown ▾]  [Start HH:MM]  →  [Ende HH:MM]  [Notiz (optional)]
                                                [Abbrechen]  [Speichern]
  ```

- Zeit-Inputs nutzen denselben Look wie die bestehenden `.ts-time-input`.
- Esc / „Abbrechen" schließt ohne Mutation.
- Wenn keine Projekte angelegt sind: Button deaktiviert, Tooltip „Zuerst ein Projekt anlegen".

## Architektur

Beide Funktionen leben in `src/ui/timesheet.js` (kein neues Modul nötig). Sie nutzen bestehende Bausteine:

- `pushUndo()` aus `src/undo.js` → beide Aktionen sind rückgängig machbar.
- `commitState()` aus `src/stateManager.js` → persist + Re-Render via `stateChanged`.
- `showAlert()` aus `src/ui/dialogs.js` → für Validierungsfehler.
- bestehender `checkTimeOverlaps()` + `showOverlapWarning()` zeigt Überlappungswarnung automatisch nach Re-Render (kein Block, konsistent mit aktuellem Verhalten).
- `switchProject()` aus `src/projects.js` → wird beim Wechsel eines laufenden Eintrags wiederverwendet.

### Neue Funktionen (in `src/ui/timesheet.js`)

| Funktion | Zweck |
|---|---|
| `changeLogProject(oldProjectId, logIdx, newProjectId)` | Eintrag in anderes Projekt verschieben (oder bei laufendem Eintrag `switchProject` aufrufen). |
| `addManualLog(projectId, dateStr, startHHMM, endHHMM, note)` | Neuen abgeschlossenen Eintrag anlegen, mit Validierung. |
| `toggleProjectPicker(projectId, logIdx, anchorEl)` | UI-Helper: Dropdown öffnen/schließen. |
| `toggleManualEntryForm()` | UI-Helper: Inline-Formular ein-/ausblenden. |
| `submitManualEntry()` | Formular validieren und `addManualLog` aufrufen. |

Alle inline-onclick-relevanten Funktionen werden zusätzlich auf `window` gehängt (analog zum bestehenden Muster am Ende von `timesheet.js`).

## Verhalten im Detail

### `changeLogProject`

- **Abgeschlossener Eintrag** (`log.end` gesetzt):
  1. `pushUndo()`
  2. Log-Objekt aus `state.projects[old].logs` entfernen (`splice`).
  3. In `state.projects[new].logs` pushen (Reihenfolge egal, Timeline sortiert beim Render).
  4. `commitState()`.
- **Laufender Eintrag** (`log.end === null`): Aufruf von `switchProject(newProjectId)` aus `projects.js`. Das stoppt das alte Projekt und startet das neue – passt zur bestehenden Tracking-Logik.
- **Wechsel auf dasselbe Projekt**: keine Mutation, Dropdown schließt sich.
- Notiz bleibt erhalten.

### `addManualLog`

Validierung in dieser Reihenfolge (alle mit `showAlert` und Rückgabewert `false`):

1. Projekt gewählt? Sonst „Bitte ein Projekt wählen."
2. Start und Ende parsbar als `HH:MM`? Sonst „Ungültiges Zeitformat. Bitte HH:MM eingeben."
3. Start < Ende? Sonst „Endzeit muss nach der Startzeit liegen."

Bei erfolgreicher Validierung:

1. Timestamps via `new Date(dateStr + 'T' + HHMM + ':00').getTime()` bauen (gleiche Logik wie in `updateTimesheetLogTime`).
2. `pushUndo()`.
3. `state.projects[id].logs.push({ start, end, note: note?.trim() || '' })`.
4. `commitState()`.
5. Formular wird zurückgesetzt und ausgeblendet (UI-Seite).

Überlappung mit anderen Einträgen: nicht blockierend; `showOverlapWarning` informiert nach Re-Render.

## Edge Cases

| Fall | Verhalten |
|---|---|
| Projekt-Wechsel auf Pausen-Eintrag | Pause-Label ist nicht klickbar (kein Picker). |
| Projekt-Wechsel auf gleiches Projekt | Keine Mutation. |
| Manueller Eintrag ohne Projekte vorhanden | Button deaktiviert. |
| Manueller Eintrag, Endzeit in Zukunft (heute) | Erlaubt – KISS, der User entscheidet. |
| Überlappung beim manuellen Anlegen | Nicht blockierend, Warnung über `showOverlapWarning`. |
| Esc während Picker oder Form offen | Schließt ohne Mutation. |

## Tests

Neue Datei `tests/timesheet.test.js` (Vitest):

- **`changeLogProject` – abgeschlossener Eintrag:** Log aus altem Projekt entfernt, im neuen vorhanden; Start/Ende/Notiz unverändert.
- **`changeLogProject` – gleiches Projekt:** keine Mutation.
- **`addManualLog` – Happy Path:** Log mit korrekten Timestamps im richtigen Projekt; Notiz übernommen.
- **`addManualLog` – Start ≥ Ende:** kein Log angelegt, `false`.
- **`addManualLog` – ungültiges Zeitformat:** kein Log angelegt, `false`.
- **`addManualLog` – `dateStr` + `HH:MM` korrekt kombiniert:** resultierender Timestamp entspricht lokaler Zeit für gegebenes Datum.

UI-Interaktionen (Dropdown öffnen, Form einblenden) werden nicht getestet – konsistent mit dem aktuellen Test-Stand, der nur Logik-Funktionen prüft.

## Nicht enthalten (out of scope)

- Manuelles Anlegen laufender Einträge (bereits durch normalen Start-Button abgedeckt).
- Drag & Drop zwischen Projekten.
- Bearbeiten von Pausen-Einträgen über das neue UI.
- Bulk-Operationen.
