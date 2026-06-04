# Design: Signalton bei Erinnerung

**Datum:** 2026-06-04
**Status:** Genehmigt (User-Approval im Brainstorming)

## Ziel

Beim Aufploppen einer normalen Erinnerung soll ein kurzer Signalton ertönen,
damit der Nutzer die Erinnerung auch bemerkt, wenn er die App nicht aktiv
ansieht. Der Ton ist in den Einstellungen abschaltbar (Standard: an).

## Entscheidungen (aus Brainstorming)

- **Tonquelle:** Synthetisch über die **Web Audio API** (kein Audio-Asset,
  kein Service-Worker-Cache für Mediendateien nötig, funktioniert offline).
- **Klang:** Dezenter **Doppel-Piep** (zwei kurze Sinustöne, ~880 Hz, je ~120 ms,
  kleine Pause dazwischen).
- **Abschaltbar:** Ja, neue Einstellung im Tab „Allgemein". Standard: an.
- **Auslöser:** **Nur normale Erinnerungen** (einmalige und Intervall-Erinnerungen).
  Der automatische Tagesabschluss-Dialog (`checkAutoStop`) bleibt stumm.

## Architektur

### 1. Neues Modul `src/sound.js`

Kapselt die gesamte Audio-Logik. Exportiert:

- `playReminderSound()` — erzeugt den Doppel-Piep über die Web Audio API.
  - `AudioContext` wird **lazy** erstellt (erst beim ersten Aufruf) und in einer
    Modul-Variable wiederverwendet. Grund: Browser blockieren Audio teils vor der
    ersten Nutzer-Interaktion; da die App ohnehin bedient wird, ist das unkritisch.
  - Zwei `OscillatorNode` (Sinus, 880 Hz) über einen `GainNode`, zeitlich
    versetzt gestartet/gestoppt (Piep 1 sofort, Piep 2 nach kurzer Pause).
  - Sanfte Gain-Hüllkurve (kurzes Fade-in/Fade-out), damit kein Knacken entsteht.
  - **Fehlerbehandlung:** Alles in `try/catch`. Bei nicht unterstütztem Browser
    oder Fehler nur `console.warn`, **nie** ein Crash, kein Toast.

Das Modul hat **keine** Abhängigkeit zu `state` — die Setting-Prüfung erfolgt am
Aufrufort (siehe Punkt 3). Dadurch bleibt `sound.js` reine, leicht testbare
Audio-Logik mit klar definierter Schnittstelle.

### 2. State: `state.settings.reminderSound`

- **Typ:** Boolean, **Default `true`**.
- In `src/state.js` im `settings`-Objekt ergänzen (analog zu `progressEnabled`).
- **Keine Migration nötig:** Aufruf erfolgt mit `state.settings.reminderSound !== false`,
  d.h. „an", außer das Feld ist explizit `false`. Ältere gespeicherte States ohne
  das Feld verhalten sich damit als „an".

### 3. Auslöser in `src/timer.js` → `checkReminders()`

An **beiden** Stellen, an denen heute `setActiveReminder(...)` aufgerufen wird
(Intervall-Zweig und einmaliger Zweig), zusätzlich:

```js
if (state.settings.reminderSound !== false) playReminderSound();
```

Import von `playReminderSound` aus `./sound.js`. Der Tagesabschluss-Dialog in
`checkAutoStop()` bleibt unverändert (stumm).

### 4. Einstellung im Tab „Allgemein"

**`index.html`:** Checkbox `#settingsReminderSound` (analog zu
`#settingsProgressEnabled`), mit Label „Signalton bei Erinnerung". Daneben ein
kleiner **Test-Button**, der `playReminderSound()` direkt aufruft, damit der
Nutzer den Ton vorhören kann.

**`src/settings.js`:**
- In `openSettingsModal()`:
  `document.getElementById('settingsReminderSound').checked = pendingSettings.reminderSound !== false;`
- In `saveSettings()`:
  `state.settings.reminderSound = document.getElementById('settingsReminderSound').checked;`
  (über `pendingSettings`, dem bestehenden Muster folgend).
- Für den Test-Button ggf. `window.testReminderSound = () => playReminderSound();`
  (inline-onclick-Muster wie im Rest des Projekts).

### 5. Service Worker

`public/sw.js`: Cache-Version hochziehen (neue Datei `src/sound.js` wird über das
bestehende Build/Caching mitgeliefert; Versions-Bump invalidiert den alten Cache).

## Datenfluss

```
tick() (1s)  →  checkReminders()
                   ├─ Bedingung erfüllt → setActiveReminder(text, idx)
                   │                       renderActiveProjectCard() / layoutMasonry()
                   └─ wenn reminderSound !== false → playReminderSound()  → Web Audio API
```

## Fehlerbehandlung

- Web Audio nicht verfügbar / Exception → `try/catch` in `sound.js`, nur `console.warn`.
- App-Funktion (Erinnerungs-Banner) ist von der Ton-Ausgabe **entkoppelt**:
  fällt der Ton aus, erscheint das Banner trotzdem.

## Tests (`tests/sound.test.js`, Vitest + jsdom)

`AudioContext` mocken (Stub mit `createOscillator`, `createGain`, `currentTime`,
`destination`). Prüfen:

1. `playReminderSound()` erzeugt zwei Oszillatoren und verbindet sie (Doppel-Piep).
2. Fehlende/fehlerhafte Web Audio API → kein Throw, nur `console.warn`.
3. (Aufruf-Logik) Bei `reminderSound === false` wird `playReminderSound` **nicht**
   aufgerufen — getestet auf Ebene von `checkReminders` (vorhandenes Mock-Muster
   aus `tests/`), oder dokumentiert als manuelle Verifikation, falls Mock-Aufwand
   unverhältnismäßig.

## Manuelle Verifikation

- In Chrome/Edge: Erinnerung mit naher Uhrzeit anlegen → Ton hörbar beim Aufploppen.
- Einstellung deaktivieren → kein Ton, Banner erscheint weiterhin.
- Test-Button in Einstellungen spielt den Ton.

## Bewusst NICHT enthalten (YAGNI)

- Keine Lautstärke-/Klang-Auswahl.
- Kein Ton für Tagesabschluss/AutoStop oder andere Ereignisse.
- Keine Audiodatei-Assets.
