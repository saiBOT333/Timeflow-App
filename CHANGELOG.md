# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier dokumentiert.

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
