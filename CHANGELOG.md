# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier dokumentiert.

---

## [3.7.0] – 2026-08-30

### Neu
- **Tageskette** (`src/timeline.js`): Der Stundenzettel behandelt einen Tag jetzt als durchgehende Kette. Zwei Regeln, beide als pure Funktionen ohne UI-Abhängigkeit:
  - **Freischneiden**: Beansprucht ein Eintrag ein Zeitfenster, weichen die anderen – angeschnittene werden gekürzt, umschließende geteilt, vollständig überdeckte entfernt
  - **Nachziehen**: Wird ein Eintrag kürzer, zieht ein vorher lückenlos anschließender Nachbar nach. Tagesende und Tagessumme bleiben dadurch stabil
- **Eintrag nachtragen gliedert sich ein**: `addManualLog()` schneidet sein Fenster frei, statt sich zu überlappen. Ein durchgelaufenes Projekt wird dabei in zwei Einträge geteilt (Notiz bleibt an beiden Teilen)
- **Rückfrage vor Löschungen**: Würde eine Änderung Einträge vollständig überschreiben, nennt ein Dialog Projektname und Uhrzeit jedes betroffenen Eintrags. Kürzen und Teilen läuft ohne Nachfrage durch
- **Undo für Stundenzettel-Änderungen**: Neuer Undo-Typ `timesheet` sichert den kompletten Projektstand, bevor die Kette mehrere Einträge anfasst – rückgängig machen trifft den ganzen Schritt

### Verbessert
- **`adjustAdjacentLogs()` ersetzt**: Die alte Funktion zog nur den direkten Nachbarn mit, und nur wenn dessen Grenze auf ±60 s an der alten lag. War die Verschiebung größer als der Nachbar lang, blockierte der Guard `newTs < log.end` und es passierte **gar nichts** – zurück blieb eine stille Lücke oder Überlappung, die nur die Warnzeile meldete. `applyBoundaryChange()` deckt jetzt beide Richtungen ab und wird auch vom Zeit-Modal (`ui/timeEdit.js`) genutzt
- **Bewusste Unterbrechungen bleiben unangetastet**: Lag zwischen zwei Einträgen schon vorher eine echte Lücke, zieht nichts nach. Pausen sind Ankerpunkte – sie werden nie verschoben oder ausgeschnitten und unterbrechen damit automatisch die Kette
- **Laufender Eintrag wird nie gelöscht**: Fällt er in ein freigeschnittenes Fenster, läuft er dahinter weiter (bzw. wird geteilt), statt den Timer still zu stoppen. Verliert ein Projekt seinen letzten offenen Eintrag, fällt der Status sauber auf `stopped`
- **Fokus überlebt den Umbau**: Baut die Kette Einträge um, muss die Karte komplett neu gerendert werden. Das fokussierte Zeitfeld wird über Projekt + Log-Objekt gemerkt (der Index verschiebt sich beim Teilen/Löschen, die Objektidentität nicht) und danach wiederhergestellt
- **Tippen bleibt ununterbrochen**: Die Kette greift erst beim Verlassen des Feldes (`onblur`) – sie kann nachfragen und andere Einträge umbauen, das gehört ans Ende der Eingabe. `pendingEdit` merkt sich dabei den Stand vor der Eingabe, damit gegen den ursprünglichen Wert geplant wird

### Intern
- **`src/undoStack.js`** neu: Stack und Toast ohne Importe. `undo.js` importiert `render.js`, wodurch jedes Modul, das nur einen Snapshot ablegen will, einen Import-Zyklus erzeugt hätte. `undo.js` re-exportiert alles, bestehende Importe bleiben gültig
- **`renderTimesheetCard()`** steigt in Umgebungen ohne DOM früh aus – damit ist der Stundenzettel auch in Node-Tests aufrufbar
- **37 neue Tests** (`tests/timeline.test.js` für die pure Logik, Integrationstests in `tests/timesheet.test.js`)

---

## [3.6.0] – 2026-08-27

### Neu
- **Tagesgrenze um 00:00 Uhr**: Jeder Tag ist eigenständig. Offene Zeiteinträge und aktive Pausen aus Vortagen werden beim Start und beim Überschreiten der Tagesgrenze automatisch abgeschlossen (`src/dayRollover.js`)
- **Heartbeat**: `tick()` schreibt alle 15 s einen Zeitstempel nach `localStorage.tf_lastActive`. Ein vergessener Feierabend wird dadurch auf den letzten tatsächlichen Laufzeitpunkt beendet statt auf 23:59:59 – ohne Heartbeat bleibt 23:59:59 als markierte Schätzung
- **Hinweis „Nicht abgestochen"**: Nennt Aktivität, gesetzte Endzeit und beendete Pausen; „Stundenzettel prüfen" stellt den Stundenzettel auf den betroffenen Tag, klappt die Karte auf und springt hin
- **Wochenübersicht – Projektnummer kopieren**: Die Nummer in der `#`-Spalte ist jetzt ein Button, der sie in die Zwischenablage legt (`src/clipboard.js`, mit `execCommand`-Fallback für unsichere Kontexte). Rückmeldung direkt am Button statt per Dialog; der Klick markiert die Zeile nicht mit. Die `#`-Spalte wurde von 72 auf 90 px verbreitert, damit lange Nummern neben dem Icon vollständig lesbar bleiben
- **Frischer Tagesstart**: Nach PC-Start und nach Standby/Ruhezustand (Heartbeat-Lücke > 5 min) läuft „Allgemein" ab jetzt neu. Lief der Rechner durch, endet der Tag um 23:59:59 ohne Neustart

### Behoben
- **Timesheet – Zeiteingabe per Tastatur**: Ein `<input type="time">` feuert `change` bereits nach jedem vollständigen Segment, also schon nach der Stunde. Der Handler rief `commitState()` auf, das Re-Render baute das fokussierte Feld neu auf und brach die Eingabe ab – Tippen war unmöglich, nur der Uhren-Picker funktionierte. `updateTimesheetLogTime()` unterscheidet jetzt zwischen laufender Eingabe (`onchange`, still übernehmen + persistieren, kein Re-Render) und beendeter Eingabe (`onblur`, Meldung bei ungültiger Zeit + Re-Render). Das Re-Render wird zusätzlich aufgeschoben, solange der Fokus im Stundenzettel bleibt (Tab ins nächste Feld); Dauer und Tagessumme werden in dieser Zeit gezielt nachgezogen, ohne die Eingabefelder anzufassen

### Verbessert
- **Timesheet – laufenden Eintrag umbuchen**: Die Projektzuordnung des laufenden Eintrags verhielt sich anders als bei abgeschlossenen Einträgen: `changeLogProject()` rief für offene Logs `switchProject()` auf, wodurch das alte Projekt gestoppt und im Zielprojekt ein **neuer** Eintrag ab jetzt gestartet wurde. Jetzt wandert der offene Log mitsamt Startzeit und Notiz zum Zielprojekt und läuft dort weiter; der Status wird nachgezogen. Zwei offene Logs in einem Projekt werden defensiv zu einem zusammengefasst
- **Lokale Tagesberechnung**: Alle „heute"- und Tagesschlüssel-Berechnungen nutzen `getLocalDateStr()` statt `toISOString()`. Zwischen 0 und 2 Uhr nachts zeigten Timesheet, Wochenübersicht, Fortschrittsanzeige und Zeit-Badges bisher den Vortag
- **`getLocalDateStr`** von `ui/autoPauses.js` nach `utils.js` verschoben (pure Funktion, keine UI-Abhängigkeit)
- **Confirm-Dialog** unterstützt mehrzeilige Meldungen (`white-space: pre-line`)

### Entfernt
- **Einstellung „Automatischer Tagesabschluss"** (`autoStopTime`) samt `checkAutoStop()` – die Tagesgrenze übernimmt diese Aufgabe zuverlässig. Der gespeicherte Wert wird beim Laden entfernt

---

## [3.4.0] – 2026-03-01

### Neu
- **Auto-Pause „Jetzt beenden"**: Neuer Button im Pause-Banner stoppt eine laufende automatische Pause sofort – nützlich wenn man früher aus der Pause zurückkommt
- **Auto-Pause `activeFrom`-Logik**: Neu konfigurierte Pausen deren Startzeit bereits vergangen ist greifen erst ab morgen; Badge „ab morgen" macht das in der Konfig sichtbar
- **Auto-Pause Time-Picker**: Zeiteingabe jetzt als gestyltes Dropdown mit 5-Minuten-Raster statt Freitexteingabe – kein manuelles Tippen, vollständig themed (Light/Dark)
- **Dark Theme Highlights**: Aktive Projekte erhalten einen farbigen Akzentstreifen links, markierte Wochenzeilen werden mit primärfarbenem Hintergrund hervorgehoben

### Verbessert
- **CSV-Export**: Zeiten werden je nach gewähltem Anzeigeformat (Dezimal oder Stunden:Minuten) korrekt ausgegeben – konsistent mit der Wochenübersicht
- **Design**: Visuelle Vereinheitlichung des Erscheinungsbilds in Light & Dark Theme; Eingabefelder, Badges und Statusanzeigen optisch überarbeitet
- **CSS-Refactoring (Schritt 3)**: Alle direkten `element.style.*`-Zuweisungen durch `classList.toggle` / `hidden`-Attribut ersetzt; State-Klassen `is-active`, `is-today`, `is-current`, `is-danger`, `list-item--fav/sub`, `bar--green/yellow/red/overtime`
- **Auto-Pause Zeitzonen-Fix**: `todayStr` nutzt jetzt lokales Datum statt UTC – verhindert fehlerhafte Pausenerkennung rund um Mitternacht
- **Auto-Pause Erkennung**: `exists`-Check nutzt `startTs` statt Label – verhindert Kollisionen zwischen manuellen und automatischen Pausen mit gleichem Namen
- **Benutzerhandbuch**: Theme-Integration – verwendet jetzt `style.css` und MD3-Farbtoken statt hardcodierter Farben

### Behoben
- **Wochenübersicht**: Zeitenberechnung korrigiert – Summen werden jetzt korrekt zusammengerechnet
- **Pause-Banner**: Erscheint wieder korrekt für manuelle und automatische Pausen (Crash durch tote `manualPauseBtn`-Referenz behoben)
- **Stundenzettel**: Löschen-Button für manuelle Pausen funktioniert wieder (rief fälschlicherweise immer `deleteAutoPauseFromTimesheet` auf)
- **Auto-Pause Default-Revival**: Leere Auto-Pause-Liste erzeugt keine Standardpausen mehr automatisch
- **`skippedAutoPauses`**: Speichert jetzt `startTs` statt `{ date, label }` – stabil auch nach „Jetzt beenden"

---

## [3.3.0] – 2026-02-26

### Neu
- **Aktivitätsbereich Banner-Modus**: Im Breit-Modus wird der Aktivitätsbereich jetzt als horizontales Banner dargestellt – Projektnummer & Name links, großer Live-Timer in der Mitte, Gesamt-Zeit & Buttons rechts
- **Erinnerungen im Breit-Modus**: Erinnerungsanzeige passt sich dem Banner an – Icon, Text und Schließen-Button horizontal nebeneinander statt vertikal gestapelt
- **Pause-Chip**: Im Breit-Modus erscheint der aktive Pause-Zustand als kompakter Chip in der linken Sektion des Banners

### Verbessert
- **PWA-Updates**: `reg.update()` bei jedem App-Start erzwingt sofortige Prüfung auf neue Version – Update-Benachrichtigung erscheint jetzt zuverlässig und nicht erst nach 24 Stunden

### Behoben
- **Wochenübersicht**: Projektnummer-Spalte (`#`) auf 72 px verbreitert – lange Projektnummern werden jetzt immer vollständig angezeigt, kein Abschneiden mehr

---

## [3.2.0] – 2026-02-25

### Neu
- **Status-Row**: Fortschrittsanzeige und Externe Links sind jetzt fest in einer gemeinsamen Zeile unterhalb der Schnellaktionen platziert
- **Externe Links als Inline-Buttons**: Die bisherige Karte entfällt – Links erscheinen als kompakte Buttons direkt neben der Fortschrittsanzeige (max. 4 Links)
- **Sichtbarkeitsmenü**: Fortschrittsanzeige und Externe Links können jetzt über „Sichtbare Karten" ein- und ausgeblendet werden
- **PWA Update-Benachrichtigung**: Nach einem Programmstart wird automatisch ein Toast angezeigt, wenn eine neue Version verfügbar ist

### Verbessert
- **Stundenzettel**: Projektnummer wird jetzt unterhalb des Projektnamens angezeigt – bleibt auch bei langen Namen mit Unterprojekt immer lesbar
- **Wochenübersicht**: Projektnummer hat eine eigene Spalte `#` ganz links – immer sichtbar, unabhängig von der Länge des Projektnamens
- **Stundenzettel**: Overflow-Fix für lange Projektnamen in Kombination mit Unterprojekten bei kompakter Kartenbreite
- **CSV-Export**: Gibt jetzt die Wochendaten der Wochenübersicht aus – ein Projekt pro Zeile, Tagesspalten und Gesamtsumme; Dateiname enthält Kalenderwoche

### Behoben
- **Wochenübersicht**: Abstand zwischen `#`-Spalte und Projektname war zu gering (Überlappung)
- **Karten**: Einklapp-Buttons mussten beim ersten Start zweimal betätigt werden – initialer Collapsed-Zustand wird jetzt korrekt aus dem DOM gelesen

---

## [3.1.0] – 2026-02-18

### Neu
- Pausen werden im Stundenzettel in der Timeline angezeigt
- Projektnummer im Stundenzettel sichtbar
- Wochenübersicht zeigt Zeiten jetzt auch im Dezimalformat
- Versionsnummer jetzt in den Einstellungen sichtbar

### Verbessert
- Bugfix: Lange Projektnamen laufen nicht mehr über die Karte hinaus – abgeschnittene Namen per Hover sichtbar

---

## [3.0.0] – 2026-01-01

### Neu
- PWA: App kann jetzt als eigenständige App auf dem Gerät installiert werden
- Mobile-Optimierungen: Layout auf kleinen Bildschirmen deutlich verbessert
- Benutzerhandbuch mit neuen SVG-Illustrationen vollständig überarbeitet
- Versionierung eingeführt – Changelog-Popup erscheint automatisch bei neuen Versionen
