# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier dokumentiert.

---

## [3.6.0] – 2026-08-27

### Neu
- **Tagesgrenze um 00:00 Uhr**: Jeder Tag ist eigenständig. Offene Zeiteinträge und aktive Pausen aus Vortagen werden beim Start und beim Überschreiten der Tagesgrenze automatisch abgeschlossen (`src/dayRollover.js`)
- **Heartbeat**: `tick()` schreibt alle 15 s einen Zeitstempel nach `localStorage.tf_lastActive`. Ein vergessener Feierabend wird dadurch auf den letzten tatsächlichen Laufzeitpunkt beendet statt auf 23:59:59 – ohne Heartbeat bleibt 23:59:59 als markierte Schätzung
- **Hinweis „Nicht abgestochen"**: Nennt Aktivität, gesetzte Endzeit und beendete Pausen; „Stundenzettel prüfen" stellt den Stundenzettel auf den betroffenen Tag, klappt die Karte auf und springt hin
- **Frischer Tagesstart**: Nach PC-Start und nach Standby/Ruhezustand (Heartbeat-Lücke > 5 min) läuft „Allgemein" ab jetzt neu. Lief der Rechner durch, endet der Tag um 23:59:59 ohne Neustart

### Verbessert
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
