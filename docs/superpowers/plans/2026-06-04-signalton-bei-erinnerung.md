# Signalton bei Erinnerung – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Beim Aufploppen einer normalen Erinnerung ertönt ein kurzer, in den Einstellungen abschaltbarer Signalton (Doppel-Piep).

**Architecture:** Neues, zustandsloses Modul `src/sound.js` erzeugt den Ton synthetisch über die Web Audio API (kein Asset). `checkReminders()` in `src/timer.js` ruft den Ton an beiden bestehenden `setActiveReminder`-Stellen auf, geschützt durch das Setting `state.settings.reminderSound`. Eine Checkbox + Test-Button im Einstellungs-Tab „Allgemein" steuert das Setting über das bestehende `pendingSettings`-Muster.

**Tech Stack:** Vanilla JS (ES-Module), Web Audio API, Vitest (jsdom), Service Worker (Cache-Bump).

---

## Dateistruktur

- **Create:** `src/sound.js` — kapselt die gesamte Audio-Logik (`playReminderSound`). Zustandslos bzgl. App-State, nur interner Lazy-`AudioContext`.
- **Create:** `tests/sound.test.js` — Unit-Tests mit gemocktem `AudioContext`.
- **Modify:** `src/state.js` — Default `reminderSound: true` im `settings`-Objekt.
- **Modify:** `src/timer.js` — Import + Aufruf in `checkReminders()` (2 Stellen), guarded.
- **Modify:** `index.html` — Checkbox `#settingsReminderSound` + Test-Button im Tab „Allgemein".
- **Modify:** `src/settings.js` — Import `playReminderSound`, `pendingSettings`-Befüllung, DOM-Init, `saveSettings`-Flush, `window.testReminderSound`.
- **Modify:** `public/sw.js` — `CACHE_VERSION` Bump.

---

## Task 1: Audio-Modul `src/sound.js` (TDD)

**Files:**
- Create: `src/sound.js`
- Test: `tests/sound.test.js`

- [ ] **Step 1: Failing-Test schreiben**

Datei `tests/sound.test.js`:

```js
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { playReminderSound } from '../src/sound.js';

// --- Minimaler Web-Audio-Mock ---------------------------------------------
function makeAudioMock() {
    const created = { oscillators: 0, gains: 0 };
    class FakeParam {
        constructor() { this.value = 0; }
        setValueAtTime() { return this; }
        linearRampToValueAtTime() { return this; }
    }
    class FakeOsc {
        constructor() { this.frequency = new FakeParam(); this.type = ''; }
        connect() {}
        start() {}
        stop() {}
    }
    class FakeGain {
        constructor() { this.gain = new FakeParam(); }
        connect() {}
    }
    class FakeCtx {
        constructor() { this.currentTime = 0; this.destination = {}; this.state = 'running'; }
        createOscillator() { created.oscillators++; return new FakeOsc(); }
        createGain() { created.gains++; return new FakeGain(); }
        resume() {}
    }
    return { FakeCtx, created };
}

describe('playReminderSound', () => {
    let restore;
    beforeEach(() => {
        restore = { AudioContext: globalThis.AudioContext, webkit: globalThis.webkitAudioContext };
    });
    afterEach(() => {
        globalThis.AudioContext = restore.AudioContext;
        globalThis.webkitAudioContext = restore.webkit;
        vi.restoreAllMocks();
    });

    it('erzeugt zwei Oszillatoren (Doppel-Piep)', () => {
        const { FakeCtx, created } = makeAudioMock();
        globalThis.AudioContext = FakeCtx;
        playReminderSound();
        expect(created.oscillators).toBe(2);
        expect(created.gains).toBe(2);
    });

    it('wirft nicht, wenn keine Web Audio API vorhanden ist', () => {
        globalThis.AudioContext = undefined;
        globalThis.webkitAudioContext = undefined;
        expect(() => playReminderSound()).not.toThrow();
    });

    it('fängt Fehler still ab und warnt (kein Throw)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        globalThis.AudioContext = class { constructor() { throw new Error('boom'); } };
        expect(() => playReminderSound()).not.toThrow();
        expect(warn).toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Test ausführen (muss fehlschlagen)**

Run: `npm test -- sound`
Expected: FAIL — `Failed to resolve import '../src/sound.js'` bzw. `playReminderSound is not a function`.

- [ ] **Step 3: `src/sound.js` implementieren**

```js
// =============================================================================
// sound.js – Synthetischer Signalton (Web Audio API)
// =============================================================================
// Zustandslos bzgl. App-State. Erzeugt einen kurzen Doppel-Piep ohne Asset.
// Fehler (kein Web-Audio-Support o.Ä.) werden still abgefangen – nie ein Crash.
// =============================================================================

let audioCtx = null;

function playBeep(ctx, startBase, offset) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    const t = startBase + offset;
    // Sanfte Hüllkurve gegen Knacken
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.01);
    gain.gain.linearRampToValueAtTime(0, t + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.13);
}

export function playReminderSound() {
    try {
        const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Ctx) return;
        if (!audioCtx) audioCtx = new Ctx();
        const ctx = audioCtx;
        // Browser starten den Context teils suspendiert
        if (ctx.state === 'suspended' && typeof ctx.resume === 'function') ctx.resume();
        const now = ctx.currentTime;
        playBeep(ctx, now, 0.0);   // Piep 1
        playBeep(ctx, now, 0.18);  // Piep 2 nach kurzer Pause
    } catch (err) {
        console.warn('playReminderSound failed:', err);
    }
}
```

- [ ] **Step 4: Test ausführen (muss bestehen)**

Run: `npm test -- sound`
Expected: PASS — 3 Tests grün.

- [ ] **Step 5: Commit**

```bash
git add src/sound.js tests/sound.test.js
git commit -m "feat(sound): playReminderSound (Web Audio Doppel-Piep) + Tests"
```

---

## Task 2: State-Default + Auslöser in `checkReminders()`

**Files:**
- Modify: `src/state.js:28`
- Modify: `src/timer.js`

- [ ] **Step 1: Default-Setting in `src/state.js` ergänzen**

In `src/state.js`, im `settings`-Objekt direkt nach `reminders: [],` (Zeile 28) einfügen:

```js
        reminders: [],
        reminderSound: true,
```

- [ ] **Step 2: Import in `src/timer.js` ergänzen**

In `src/timer.js` nach den bestehenden Imports (nach Zeile 11, `import { layoutMasonry } ...`) ergänzen:

```js
import { playReminderSound } from './sound.js';
```

- [ ] **Step 3: Ton im Intervall-Zweig auslösen**

In `src/timer.js`, Funktion `checkReminders()`, Intervall-Zweig: Es gibt zwei `setActiveReminder(r.text, idx);`-Aufrufe innerhalb des `if (r.intervalMin ...)`-Blocks (lastFired===0 und else-if). Direkt **nach jedem** dieser beiden `setActiveReminder(r.text, idx);` ergänzen:

```js
                if (state.settings.reminderSound !== false) playReminderSound();
```

(Einrückung an die jeweilige Zeile anpassen.)

- [ ] **Step 4: Ton im einmaligen Zweig auslösen**

Im selben File, einmaliger Zweig (`if (currentHHMM >= r.time && currentHHMM < incrementTime(r.time, 1))`), direkt nach `setActiveReminder(r.text, idx);` ergänzen:

```js
            if (state.settings.reminderSound !== false) playReminderSound();
```

- [ ] **Step 5: Bestehende Tests laufen lassen (Regression)**

Run: `npm test`
Expected: PASS — alle bisherigen Tests + sound-Tests grün (kein Test importiert `checkReminders` mit Audio; `state.js`-Default unkritisch).

- [ ] **Step 6: Commit**

```bash
git add src/state.js src/timer.js
git commit -m "feat(timer): Signalton bei Erinnerung auslösen (guarded via reminderSound)"
```

---

## Task 3: Einstellung im Tab „Allgemein" (UI)

**Files:**
- Modify: `index.html` (Tab „Allgemein", nach dem Begrüßungstext-Block ~Zeile 90)
- Modify: `src/settings.js`

- [ ] **Step 1: Checkbox + Test-Button in `index.html` einfügen**

In `index.html`, im Tab `tab-general`, direkt **nach** dem schließenden `</div>` des Begrüßungstext-`setting-group` (nach Zeile 90) einfügen:

```html
                <div class="setting-group">
                    <label class="setting-label">Signalton bei Erinnerung</label>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <input type="checkbox" id="settingsReminderSound" style="width:20px; height:20px; cursor:pointer;" onchange="pendingSettings.reminderSound = this.checked">
                        <span class="fs-13-variant">Spielt einen kurzen Ton, wenn eine Erinnerung aufploppt</span>
                        <button type="button" class="md-btn md-btn-tonal" style="margin-left:auto;" onclick="testReminderSound()">Test</button>
                    </div>
                </div>
```

- [ ] **Step 2: Import in `src/settings.js` ergänzen**

In `src/settings.js` nach Zeile 6 (`import { isSupported, ... } from './backupFolder.js';`) ergänzen:

```js
import { playReminderSound } from './sound.js';
```

- [ ] **Step 3: `pendingSettings`-Befüllung erweitern**

In `openSettingsModal()`, im `pendingSettings = { ... }`-Objekt, nach `progressEnabled: state.settings.progressEnabled !== false,` (Zeile 52) ergänzen:

```js
        reminderSound:   state.settings.reminderSound !== false,
```

- [ ] **Step 4: DOM-Init ergänzen**

In `openSettingsModal()`, nach `document.getElementById('settingsProgressEnabled').checked = pendingSettings.progressEnabled;` (Zeile 66) ergänzen:

```js
    document.getElementById('settingsReminderSound').checked = pendingSettings.reminderSound;
```

- [ ] **Step 5: `saveSettings()`-Flush + Test-Handler ergänzen**

In `saveSettings()`, nach `state.settings.progressEnabled = pendingSettings.progressEnabled;` (Zeile 151) ergänzen:

```js
    state.settings.reminderSound = pendingSettings.reminderSound;
```

Außerdem (für den inline-onclick `testReminderSound()`), nach der `saveSettings`-Funktion bzw. bei den anderen `window.*`-Zuweisungen (z.B. nach Zeile 144) ergänzen:

```js
window.testReminderSound = () => playReminderSound();
```

- [ ] **Step 6: Manuelle Verifikation im Browser**

Run: `npm run dev` (Vite, Port 5500), in Chrome/Edge öffnen.
- Einstellungen → Tab „Allgemein" → Checkbox „Signalton bei Erinnerung" sichtbar, standardmäßig **an**.
- Klick auf „Test" → Doppel-Piep hörbar.
- Checkbox aus → Speichern → erneut öffnen → bleibt aus.

- [ ] **Step 7: Commit**

```bash
git add index.html src/settings.js
git commit -m "feat(settings): Schalter + Test-Button für Erinnerungs-Signalton"
```

---

## Task 4: Service-Worker-Cache-Bump

**Files:**
- Modify: `public/sw.js:10`

- [ ] **Step 1: `CACHE_VERSION` hochziehen**

In `public/sw.js`, Zeile 10, ändern:

```js
const CACHE_VERSION = 'timeflow-v3.5.5';
```

- [ ] **Step 2: Commit**

```bash
git add public/sw.js
git commit -m "chore(pwa): SW-Cache-Version für Signalton-Feature hochgezogen"
```

---

## Hinweise zur manuellen End-to-End-Verifikation (nur Chrome/Edge)

Die Logik ist durch Unit-Tests abgedeckt; die tatsächliche Ton-Ausgabe ist nur
manuell im Browser prüfbar:

1. Erinnerung mit Uhrzeit ~1 Min in der Zukunft anlegen → beim Aufploppen ertönt der Doppel-Piep.
2. Setting deaktivieren → kein Ton, Banner erscheint weiterhin.
3. Tagesabschluss/AutoStop → **kein** Ton (bewusst stumm).
