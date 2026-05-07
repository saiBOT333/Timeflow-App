# Timesheet: Projekt-Wechsel und manueller Eintrag – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Im Timesheet-Card können Nutzer das Projekt eines bestehenden Eintrags wechseln und manuell neue abgeschlossene Einträge hinzufügen, um lückenhaftes Tracking nachträglich korrigieren zu können.

**Architecture:** Beide Funktionen werden in `src/ui/timesheet.js` ergänzt (kein neues Modul). Reine Logik (`changeLogProject`, `addManualLog`) bekommt Vitest-Tests; UI wird im bestehenden `renderTimesheetCard()` integriert (klickbarer Projektname mit Dropdown, „+ Eintrag"-Button mit Inline-Formular). State-Mutationen laufen über `commitState()` aus `stateManager.js` – konsistent mit den bestehenden Edit-Funktionen in `timesheet.js`.

**Tech Stack:** Vanilla JS (ES Modules), Vitest (node-Environment für Logik), bestehender Material-Symbols-Look, CSS in `style.css`.

**Hinweis zur Spec-Abweichung:** Die Spec erwähnt `pushUndo()`. Die bestehenden Timesheet-Edit-Funktionen (`updateTimesheetLogTime`, `deleteTimesheetLog`) nutzen kein granulares Undo – nur das Feierabend-Backup und Projekt-Löschen pushen auf den Undo-Stack (siehe `src/undo.js`). Dieser Plan folgt dem bestehenden Muster (kein `pushUndo()`), um konsistent zu bleiben.

---

## File Structure

| Datei | Aktion | Verantwortung |
|---|---|---|
| `src/ui/timesheet.js` | Modify | Neue Logik + UI für `changeLogProject`, `addManualLog`, Picker, Manual-Form |
| `tests/timesheet.test.js` | Create | Vitest-Logik-Tests für `changeLogProject` und `addManualLog` |
| `style.css` | Modify | CSS für `.ts-project-picker`, `.ts-manual-entry-form`, klickbarer Projektname |

---

## Task 1: Test-Setup + `addManualLog` Happy Path (TDD)

**Files:**
- Create: `tests/timesheet.test.js`
- Modify: `src/ui/timesheet.js` (export `addManualLog`)

- [ ] **Step 1: Test-Datei mit Happy-Path-Test anlegen**

Datei `tests/timesheet.test.js`:

```js
// =============================================================================
// timesheet.test.js – Tests für addManualLog & changeLogProject (Logik-Ebene)
// =============================================================================
// state.projects wird vor jedem Test zurückgesetzt.
// =============================================================================
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { state } from '../src/state.js';

// stateManager.commitState würde in JSDOM Events dispatchen → für reine
// Logik-Tests stubbed. storage/render werden nicht getestet.
vi.mock('../src/stateManager.js', () => ({
    commitState: vi.fn(),
    persistState: vi.fn(),
    notifyStateChanged: vi.fn(),
}));
// dialogs.showAlert nutzt DOM → für Logik-Tests neutralisieren.
vi.mock('../src/ui/dialogs.js', () => ({
    showAlert: vi.fn(),
    showConfirm: vi.fn(),
}));
// pauses-Modul (nur für Re-Export auf window) – stubben.
vi.mock('../src/pauses.js', () => ({
    deletePause: vi.fn(),
    deleteAutoPauseFromTimesheet: vi.fn(),
}));

import { addManualLog, changeLogProject } from '../src/ui/timesheet.js';

beforeEach(() => {
    state.projects = [
        { id: 'p1', name: 'Projekt A', color: '#ff0000', logs: [], status: 'idle' },
        { id: 'p2', name: 'Projekt B', color: '#00ff00', logs: [], status: 'idle' },
    ];
});

describe('addManualLog – Happy Path', () => {
    test('legt Log mit korrekten Timestamps und Notiz an', () => {
        const ok = addManualLog('p1', '2026-05-07', '09:30', '11:15', 'Meeting');
        expect(ok).toBe(true);
        expect(state.projects[0].logs).toHaveLength(1);
        const log = state.projects[0].logs[0];
        const expectedStart = new Date('2026-05-07T09:30:00').getTime();
        const expectedEnd = new Date('2026-05-07T11:15:00').getTime();
        expect(log.start).toBe(expectedStart);
        expect(log.end).toBe(expectedEnd);
        expect(log.note).toBe('Meeting');
    });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag verifizieren**

Run: `npm test -- timesheet`
Expected: FAIL – `addManualLog` ist kein Export von `src/ui/timesheet.js`.

- [ ] **Step 3: `addManualLog` in `src/ui/timesheet.js` implementieren**

Am Ende von `src/ui/timesheet.js`, **vor** dem `window.*`-Block, einfügen:

```js
// =============================================================================
// addManualLog – manuell abgeschlossenen Eintrag anlegen
// =============================================================================
// Liefert true bei Erfolg, false bei Validierungsfehler.
function parseHHMM(value) {
    if (typeof value !== 'string') return null;
    const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return { h, min };
}

export function addManualLog(projectId, dateStr, startHHMM, endHHMM, note) {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) {
        showAlert('Bitte ein Projekt wählen.', { title: 'Kein Projekt', icon: 'error' });
        return false;
    }
    const s = parseHHMM(startHHMM);
    const e = parseHHMM(endHHMM);
    if (!s || !e) {
        showAlert('Ungültiges Zeitformat. Bitte HH:MM eingeben.', { title: 'Ungültige Zeit', icon: 'error' });
        return false;
    }
    const startTs = new Date(dateStr + 'T' + String(s.h).padStart(2, '0') + ':' + String(s.min).padStart(2, '0') + ':00').getTime();
    const endTs = new Date(dateStr + 'T' + String(e.h).padStart(2, '0') + ':' + String(e.min).padStart(2, '0') + ':00').getTime();
    if (isNaN(startTs) || isNaN(endTs)) {
        showAlert('Ungültiges Datum oder Zeit.', { title: 'Ungültige Zeit', icon: 'error' });
        return false;
    }
    if (endTs <= startTs) {
        showAlert('Endzeit muss nach der Startzeit liegen.', { title: 'Ungültige Zeit', icon: 'error' });
        return false;
    }
    if (!Array.isArray(project.logs)) project.logs = [];
    project.logs.push({ start: startTs, end: endTs, note: (note || '').trim() });
    commitState();
    return true;
}
```

- [ ] **Step 4: Test erneut ausführen, grün verifizieren**

Run: `npm test -- timesheet`
Expected: PASS für „addManualLog – Happy Path".

- [ ] **Step 5: Commit**

```bash
git add tests/timesheet.test.js src/ui/timesheet.js
git commit -m "feat(timesheet): addManualLog – Logik + Happy-Path-Test"
```

---

## Task 2: `addManualLog` Validierungs-Tests

**Files:**
- Modify: `tests/timesheet.test.js`

- [ ] **Step 1: Validierungs-Tests ergänzen**

In `tests/timesheet.test.js` nach dem Happy-Path-`describe`-Block ergänzen:

```js
describe('addManualLog – Validierung', () => {
    test('unbekannte Projekt-ID → false, kein Log angelegt', () => {
        const ok = addManualLog('unknown', '2026-05-07', '09:00', '10:00', '');
        expect(ok).toBe(false);
        expect(state.projects[0].logs).toHaveLength(0);
        expect(state.projects[1].logs).toHaveLength(0);
    });

    test('ungültiges Zeitformat (Start) → false', () => {
        const ok = addManualLog('p1', '2026-05-07', '9 Uhr', '10:00', '');
        expect(ok).toBe(false);
        expect(state.projects[0].logs).toHaveLength(0);
    });

    test('ungültiges Zeitformat (Ende) → false', () => {
        const ok = addManualLog('p1', '2026-05-07', '09:00', '25:99', '');
        expect(ok).toBe(false);
        expect(state.projects[0].logs).toHaveLength(0);
    });

    test('Start gleich Ende → false', () => {
        const ok = addManualLog('p1', '2026-05-07', '10:00', '10:00', '');
        expect(ok).toBe(false);
        expect(state.projects[0].logs).toHaveLength(0);
    });

    test('Start nach Ende → false', () => {
        const ok = addManualLog('p1', '2026-05-07', '12:00', '11:00', '');
        expect(ok).toBe(false);
        expect(state.projects[0].logs).toHaveLength(0);
    });

    test('Notiz leer/undefined → log.note ist leerer String', () => {
        addManualLog('p1', '2026-05-07', '09:00', '10:00', undefined);
        expect(state.projects[0].logs[0].note).toBe('');
    });

    test('Notiz wird getrimmt', () => {
        addManualLog('p1', '2026-05-07', '09:00', '10:00', '   Hallo   ');
        expect(state.projects[0].logs[0].note).toBe('Hallo');
    });
});
```

- [ ] **Step 2: Tests ausführen, alle grün verifizieren**

Run: `npm test -- timesheet`
Expected: alle bisherigen Tests PASS (8 Tests).

- [ ] **Step 3: Commit**

```bash
git add tests/timesheet.test.js
git commit -m "test(timesheet): addManualLog – Validierungsfälle"
```

---

## Task 3: `changeLogProject` für abgeschlossene Einträge (TDD)

**Files:**
- Modify: `tests/timesheet.test.js`
- Modify: `src/ui/timesheet.js` (export `changeLogProject`)

- [ ] **Step 1: Tests schreiben**

In `tests/timesheet.test.js` ergänzen:

```js
describe('changeLogProject – abgeschlossener Eintrag', () => {
    beforeEach(() => {
        state.projects[0].logs = [
            { start: 1000, end: 2000, note: 'a' },
            { start: 3000, end: 4000, note: 'b' },
        ];
    });

    test('verschiebt Log korrekt zwischen Projekten', () => {
        const ok = changeLogProject('p1', 0, 'p2');
        expect(ok).toBe(true);
        expect(state.projects[0].logs).toHaveLength(1);
        expect(state.projects[0].logs[0].note).toBe('b');
        expect(state.projects[1].logs).toHaveLength(1);
        expect(state.projects[1].logs[0]).toEqual({ start: 1000, end: 2000, note: 'a' });
    });

    test('Wechsel auf gleiches Projekt: keine Mutation, false', () => {
        const ok = changeLogProject('p1', 0, 'p1');
        expect(ok).toBe(false);
        expect(state.projects[0].logs).toHaveLength(2);
        expect(state.projects[1].logs).toHaveLength(0);
    });

    test('unbekannte Projekt-ID (Quelle) → false', () => {
        const ok = changeLogProject('unknown', 0, 'p2');
        expect(ok).toBe(false);
        expect(state.projects[0].logs).toHaveLength(2);
    });

    test('unbekannte Projekt-ID (Ziel) → false', () => {
        const ok = changeLogProject('p1', 0, 'unknown');
        expect(ok).toBe(false);
        expect(state.projects[0].logs).toHaveLength(2);
    });

    test('ungültiger logIdx → false', () => {
        const ok = changeLogProject('p1', 99, 'p2');
        expect(ok).toBe(false);
        expect(state.projects[0].logs).toHaveLength(2);
    });
});
```

- [ ] **Step 2: Tests ausführen, Fehlschlag wegen fehlendem Export verifizieren**

Run: `npm test -- timesheet`
Expected: FAIL – `changeLogProject` ist kein Export.

- [ ] **Step 3: `changeLogProject` in `src/ui/timesheet.js` implementieren**

In `src/ui/timesheet.js` direkt nach `addManualLog` einfügen:

```js
// =============================================================================
// changeLogProject – Eintrag in anderes Projekt verschieben
// =============================================================================
// Für laufende Einträge ruft diese Funktion stattdessen switchProject() auf
// (Import unten ergänzt). Liefert true bei Mutation.
export function changeLogProject(oldProjectId, logIdx, newProjectId) {
    if (oldProjectId === newProjectId) return false;
    const oldP = state.projects.find(p => p.id === oldProjectId);
    const newP = state.projects.find(p => p.id === newProjectId);
    if (!oldP || !newP) return false;
    if (!Array.isArray(oldP.logs) || logIdx < 0 || logIdx >= oldP.logs.length) return false;
    const log = oldP.logs[logIdx];

    // Laufender Eintrag → bestehende switchProject-Logik nutzen.
    if (log.end === null || log.end === undefined) {
        switchProject(newProjectId);
        return true;
    }

    oldP.logs.splice(logIdx, 1);
    if (!Array.isArray(newP.logs)) newP.logs = [];
    newP.logs.push(log);
    commitState();
    return true;
}
```

Am Anfang von `src/ui/timesheet.js` (bei den anderen Imports) ergänzen:

```js
import { switchProject } from '../projects.js';
```

- [ ] **Step 4: Tests ausführen, alle grün verifizieren**

Run: `npm test -- timesheet`
Expected: alle Tests PASS (13 Tests).

- [ ] **Step 5: Commit**

```bash
git add tests/timesheet.test.js src/ui/timesheet.js
git commit -m "feat(timesheet): changeLogProject – Logik + Tests"
```

---

## Task 4: UI – Klickbarer Projektname + Projekt-Picker-Dropdown

**Files:**
- Modify: `src/ui/timesheet.js` (renderTimesheetCard, neuer Helper `renderProjectPicker`, `toggleProjectPicker`, `pickProjectForLog`)
- Modify: `style.css`

- [ ] **Step 1: `renderTimesheetCard` – Projektname klickbar machen**

In `src/ui/timesheet.js`, im Block `// --- Projekt-Eintrag ---` den `projectLabel`-`<span>` ersetzen.

Vorher (Zeilen rund um 200-203):

```js
                    <div class="ts-entry-project-info">
                        <span class="ts-entry-project" style="color:${pColor};" title="${escapeHtml(projectLabel)}">${escapeHtml(projectLabel)}</span>
                        ${projectNum ? `<span class="ts-entry-num">${projectNum}</span>` : ''}
                    </div>
```

Nachher:

```js
                    <div class="ts-entry-project-info">
                        <button type="button" class="ts-entry-project ts-entry-project-btn"
                            style="color:${pColor};"
                            title="Projekt wechseln"
                            onclick="toggleProjectPicker('${p.id}', ${entry.logIdx}, this)">
                            ${escapeHtml(projectLabel)}
                            <span class="material-symbols-rounded fs-14">expand_more</span>
                        </button>
                        ${projectNum ? `<span class="ts-entry-num">${projectNum}</span>` : ''}
                    </div>
```

- [ ] **Step 2: Picker-Helper-Funktionen ergänzen**

In `src/ui/timesheet.js` direkt vor dem `window.*`-Block einfügen:

```js
// =============================================================================
// Projekt-Picker (Dropdown beim Klick auf Projektname)
// =============================================================================
let openPickerEl = null;

function getActiveProjectsForPicker() {
    return state.projects
        .filter(p => !p.archived)
        .map(p => {
            const parent = p.parentId ? state.projects.find(pp => pp.id === p.parentId) : null;
            const label = parent ? parent.name + ' → ' + p.name : p.name;
            return { id: p.id, label, color: p.color || '#757575', sortKey: (parent ? parent.name : p.name) + ' ' + p.name };
        })
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey, 'de'));
}

function closeProjectPicker() {
    if (openPickerEl) {
        openPickerEl.remove();
        openPickerEl = null;
        document.removeEventListener('click', onPickerOutsideClick, true);
        document.removeEventListener('keydown', onPickerKeydown, true);
    }
}

function onPickerOutsideClick(ev) {
    if (openPickerEl && !openPickerEl.contains(ev.target) && !ev.target.closest('.ts-entry-project-btn')) {
        closeProjectPicker();
    }
}

function onPickerKeydown(ev) {
    if (ev.key === 'Escape') closeProjectPicker();
}

export function toggleProjectPicker(projectId, logIdx, anchorBtn) {
    if (openPickerEl) {
        closeProjectPicker();
        return;
    }
    const list = getActiveProjectsForPicker();
    if (list.length === 0) return;
    const picker = document.createElement('div');
    picker.className = 'ts-project-picker';
    picker.innerHTML = list.map(p =>
        `<button type="button" class="ts-project-picker-item${p.id === projectId ? ' is-current' : ''}"
            onclick="pickProjectForLog('${projectId}', ${logIdx}, '${p.id}')">
            <span class="ts-project-picker-dot" style="background:${p.color};"></span>
            <span class="ts-project-picker-label">${escapeHtml(p.label)}</span>
        </button>`
    ).join('');

    // Picker direkt nach dem Anchor-Element einfügen, damit es relativ positioniert werden kann.
    const entryContent = anchorBtn.closest('.ts-entry-content');
    if (!entryContent) return;
    entryContent.appendChild(picker);
    openPickerEl = picker;

    // Outside-click + Esc verzögert anhängen (Click, der Picker geöffnet hat, soll nicht direkt schließen).
    setTimeout(() => {
        document.addEventListener('click', onPickerOutsideClick, true);
        document.addEventListener('keydown', onPickerKeydown, true);
    }, 0);
}

export function pickProjectForLog(oldProjectId, logIdx, newProjectId) {
    closeProjectPicker();
    changeLogProject(oldProjectId, logIdx, newProjectId);
}
```

- [ ] **Step 3: Window-Handler ergänzen**

Am Ende von `src/ui/timesheet.js`, im `window.*`-Block, ergänzen:

```js
window.toggleProjectPicker = toggleProjectPicker;
window.pickProjectForLog = pickProjectForLog;
```

- [ ] **Step 4: CSS für Picker und klickbaren Projektnamen**

In `style.css` am Ende anhängen:

```css
/* === Timesheet: klickbarer Projektname + Picker === */
.ts-entry-project-btn {
    background: transparent;
    border: none;
    padding: 2px 4px;
    margin: -2px -4px;
    border-radius: 4px;
    font: inherit;
    color: inherit;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.ts-entry-project-btn:hover {
    background: var(--md-sys-color-surface-container-high);
}
.ts-entry-project-btn .material-symbols-rounded {
    opacity: 0.6;
    flex-shrink: 0;
}
.ts-project-picker {
    position: absolute;
    z-index: 100;
    margin-top: 4px;
    background: var(--md-sys-color-surface-container);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    padding: 4px;
    max-height: 280px;
    overflow-y: auto;
    min-width: 200px;
    max-width: 320px;
}
.ts-project-picker-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 10px;
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    color: var(--md-sys-color-on-surface);
    font-size: 13px;
}
.ts-project-picker-item:hover {
    background: var(--md-sys-color-surface-container-highest);
}
.ts-project-picker-item.is-current {
    background: var(--md-sys-color-secondary-container);
    color: var(--md-sys-color-on-secondary-container);
}
.ts-project-picker-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
}
.ts-project-picker-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.ts-entry-content { position: relative; }
```

- [ ] **Step 5: Tests laufen lassen (sicherstellen, dass nichts kaputt ist)**

Run: `npm test`
Expected: alle Tests PASS.

- [ ] **Step 6: Manuell verifizieren (Dev-Server)**

Run: `npm run dev` (Port 5500). Im Browser:
1. Timesheet-Karte öffnen.
2. Auf einen Projekt-Eintrag mit `end` ≠ null klicken → Dropdown erscheint mit allen aktiven Projekten.
3. Anderes Projekt wählen → Eintrag erscheint sofort unter neuem Projekt.
4. Outside-Click und Esc → Dropdown schließt ohne Mutation.

- [ ] **Step 7: Commit**

```bash
git add src/ui/timesheet.js style.css
git commit -m "feat(timesheet): Projekt eines Eintrags per Picker wechseln"
```

---

## Task 5: UI – „+ Eintrag hinzufügen"-Button + Inline-Formular

**Files:**
- Modify: `src/ui/timesheet.js` (renderTimesheetCard, `toggleManualEntryForm`, `submitManualEntry`)
- Modify: `style.css`

- [ ] **Step 1: Render – Button und (initial verstecktes) Formular einbauen**

In `src/ui/timesheet.js`, in `renderTimesheetCard()` direkt **nach** dem `ts-day-summary`-Block (vor `if (entries.length === 0)`), einfügen:

```js
const hasProjects = state.projects.some(p => !p.archived);
html += `<div class="ts-manual-row">
    <button type="button" class="ts-manual-btn" onclick="toggleManualEntryForm()"
        ${hasProjects ? '' : 'disabled title="Zuerst ein Projekt anlegen"'}>
        <span class="material-symbols-rounded fs-16">add</span>
        Eintrag hinzufügen
    </button>
    <div class="ts-manual-form is-hidden" id="tsManualForm">
        <select class="ts-manual-project" id="tsManualProject">
            ${getActiveProjectsForPicker().map(p =>
                `<option value="${p.id}">${escapeHtml(p.label)}</option>`
            ).join('')}
        </select>
        <input type="text" class="ts-time-input" id="tsManualStart" placeholder="HH:MM" maxlength="5">
        <span class="ts-entry-arrow">→</span>
        <input type="text" class="ts-time-input" id="tsManualEnd" placeholder="HH:MM" maxlength="5">
        <input type="text" class="ts-manual-note" id="tsManualNote" placeholder="Notiz (optional)">
        <button type="button" class="ts-manual-cancel" onclick="toggleManualEntryForm()">Abbrechen</button>
        <button type="button" class="ts-manual-save" onclick="submitManualEntry()">Speichern</button>
    </div>
</div>`;
```

- [ ] **Step 2: Form-Toggle und Submit-Funktionen ergänzen**

In `src/ui/timesheet.js` direkt nach `pickProjectForLog` einfügen:

```js
// =============================================================================
// Manueller Eintrag – Inline-Formular
// =============================================================================
export function toggleManualEntryForm() {
    const form = document.getElementById('tsManualForm');
    if (!form) return;
    const willOpen = form.classList.contains('is-hidden');
    form.classList.toggle('is-hidden');
    if (willOpen) {
        const startInput = document.getElementById('tsManualStart');
        if (startInput) startInput.focus();
        // Esc schließt das Formular.
        document.addEventListener('keydown', onManualFormKeydown);
    } else {
        // Formular zurücksetzen.
        ['tsManualStart', 'tsManualEnd', 'tsManualNote'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.removeEventListener('keydown', onManualFormKeydown);
    }
}

function onManualFormKeydown(ev) {
    if (ev.key === 'Escape') {
        const form = document.getElementById('tsManualForm');
        if (form && !form.classList.contains('is-hidden')) toggleManualEntryForm();
    }
}

export function submitManualEntry() {
    const projectId = document.getElementById('tsManualProject')?.value;
    const startVal = document.getElementById('tsManualStart')?.value || '';
    const endVal = document.getElementById('tsManualEnd')?.value || '';
    const noteVal = document.getElementById('tsManualNote')?.value || '';
    const dateStr = getTimesheetDate();
    const ok = addManualLog(projectId, dateStr, startVal, endVal, noteVal);
    if (ok) {
        // Form-Reset + schließen erfolgt durch Re-Render via commitState; hier nur explizit.
        toggleManualEntryForm();
    }
}
```

- [ ] **Step 3: Window-Handler ergänzen**

Im `window.*`-Block am Ende von `src/ui/timesheet.js`:

```js
window.toggleManualEntryForm = toggleManualEntryForm;
window.submitManualEntry = submitManualEntry;
```

- [ ] **Step 4: CSS für Button und Formular**

In `style.css` am Ende anhängen:

```css
/* === Timesheet: Manueller Eintrag === */
.ts-manual-row {
    margin: 8px 0 4px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.ts-manual-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: transparent;
    border: 1px dashed var(--md-sys-color-outline);
    border-radius: 8px;
    color: var(--md-sys-color-primary);
    font-size: 13px;
    cursor: pointer;
    align-self: flex-start;
}
.ts-manual-btn:hover:not(:disabled) {
    background: var(--md-sys-color-surface-container-high);
}
.ts-manual-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
.ts-manual-form {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px;
    background: var(--md-sys-color-surface-container);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: 8px;
}
.ts-manual-form.is-hidden {
    display: none;
}
.ts-manual-project {
    flex: 1 1 160px;
    min-width: 140px;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid var(--md-sys-color-outline-variant);
    background: var(--md-sys-color-surface);
    color: var(--md-sys-color-on-surface);
    font-size: 13px;
}
.ts-manual-note {
    flex: 2 1 180px;
    min-width: 140px;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid var(--md-sys-color-outline-variant);
    background: var(--md-sys-color-surface);
    color: var(--md-sys-color-on-surface);
    font-size: 13px;
}
.ts-manual-cancel,
.ts-manual-save {
    padding: 4px 12px;
    border-radius: 6px;
    border: none;
    font-size: 13px;
    cursor: pointer;
}
.ts-manual-cancel {
    background: transparent;
    color: var(--md-sys-color-on-surface-variant);
}
.ts-manual-save {
    background: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
}
.ts-manual-save:hover {
    filter: brightness(1.1);
}
```

- [ ] **Step 5: Tests laufen lassen**

Run: `npm test`
Expected: alle Tests PASS.

- [ ] **Step 6: Manuell verifizieren (Dev-Server)**

Run: `npm run dev`. Im Browser:
1. Timesheet-Karte öffnen, „+ Eintrag hinzufügen" klicken → Formular öffnet, Start-Input fokussiert.
2. Projekt + `09:00` + `10:30` + Notiz „Test" → Speichern → Eintrag erscheint in Timeline, Tagessumme aktualisiert.
3. Esc / Abbrechen schließt Formular ohne Eintrag.
4. Ungültige Zeit (z. B. `25:00`) → Alert „Ungültiges Zeitformat".
5. Endzeit ≤ Startzeit → Alert „Endzeit muss nach der Startzeit liegen".
6. Wenn keine Projekte vorhanden: Button ist deaktiviert.

- [ ] **Step 7: Commit**

```bash
git add src/ui/timesheet.js style.css
git commit -m "feat(timesheet): manueller Eintrag per Inline-Formular hinzufügen"
```

---

## Task 6: Integration – Beide Funktionen zusammen verifizieren

**Files:** keine Änderungen, nur Verifikation.

- [ ] **Step 1: Komplette Test-Suite**

Run: `npm test`
Expected: alle Tests grün (mind. 75 alte + 13 neue = 88).

- [ ] **Step 2: Manuelles End-to-End-Szenario im Browser**

Run: `npm run dev`. Szenario „Tag nachträglich korrigieren":

1. Beliebiges Datum im Timesheet wählen.
2. Manuellen Eintrag „Projekt A 09:00–10:30" anlegen.
3. Auf den Projektnamen klicken, „Projekt B" wählen → Eintrag wechselt.
4. Zweiten manuellen Eintrag „Projekt A 11:00–12:00" anlegen.
5. Tagessumme korrekt? Überlappungswarnung erscheint, falls Zeiten kollidieren? ✓

- [ ] **Step 3: Commit (falls Hotfixes nötig waren) oder einfach weiter**

Wenn keine Code-Änderungen: kein Commit. Andernfalls Hotfixes als eigene Commits.

---

## Summary

| Task | Output |
|---|---|
| 1 | `addManualLog` Logik + Happy-Path-Test |
| 2 | `addManualLog` Validierungs-Tests |
| 3 | `changeLogProject` Logik + Tests |
| 4 | UI: klickbarer Projektname + Picker-Dropdown |
| 5 | UI: „+ Eintrag"-Button + Inline-Formular |
| 6 | End-to-End-Verifikation |
