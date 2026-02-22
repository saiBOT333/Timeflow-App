# TimeFlow 3.0 — Verbesserungsplan

## Status-Legende
- ⬜ Offen
- 🔄 In Arbeit
- ✅ Erledigt

---

## Paket 1 — Quick Wins (sofort sichtbar, wenig Risiko) ✅
- ✅ **1.1** Dynamischer Browser-Tab-Titel — Zeigt `▶ Projektname — 02:45 | TimeFlow` im Tab
- ✅ **1.2** `confirm()`/`alert()` durch eigene Material-3-Modals ersetzen
- ✅ **1.3** `md-btn-tonal:hover` Theme-Fix — Hardcoded `#445160` durch CSS-Variable ersetzen
- ✅ **1.4** Timesheet umgebaut — Tagesaktuelles Zeitlog mit Timeline, editierbaren Start-/Endzeiten und Löschfunktion

---

## Paket 2 — Pausen konfigurierbar ✅
- ✅ **2.1** Automatische Pausen aus Einstellungen steuern — `AUTO_PAUSES` → `state.settings.autoPauses` mit Migration
- ✅ **2.2** UI in Pausen-Karte — Direkt editierbar: Zeiten, Labels, Hinzufügen/Entfernen mit Confirm
- ✅ **2.3** Home-Office blendet nur Auto-Pausen aus — Logik verifiziert, Badge "deaktiviert" + Opacity

---

## Paket 3 — Farbpicker für Projekte
- ⬜ **3.1** Farbpicker im Projekt-Erstellen-Formular — Kleiner Farbkreis neben Nr./Name
- ⬜ **3.2** Farbpicker im Projekt-Bearbeiten-Modal — Nachträgliche Farbänderung
- ⬜ **3.3** Unterprojekte erben Farbe, können aber überschreiben

---

## Paket 4 — Settings in Tabs aufteilen ✅
- ✅ **4.1** Tab-Navigation im Settings-Modal — 4 Tabs: Allgemein, Fortschritt, Links, Erinnerungen
- ✅ **4.2** Tab-Inhalte als Sektionen — Bestehende Inhalte in Tab-Panels verschoben
- ✅ **4.3** Live-Preview für Fortschrittsbalken-Schwellen — Animierter Farbbalken mit % Labels

---

## Paket 5 — Kontextfarbe & Textkontrast ✅
- ✅ **5.1** Dynamische Kontrastberechnung — `getContrastTextColor()` mit WCAG-Luminanz, auto hell/dunkel im Aktivitätsbereich + Stopp-Button
- ✅ **5.2** Zeitanzeigen in Listen klarer beschriften — Mini-Labels "Heute" vor dem Zeit-Chip, Favoriten mit farbigem Border-Tint

---

## Paket 6 — Hilfe besser integriert ✅
- ✅ **6.1** Kontextsensitive Tooltips — CSS-only `[data-tooltip]` System, Material-Stil, auf Header-Buttons + Card-Buttons
- ✅ **6.2** Onboarding bei erstem Start — 3-Schritt-Tour (Willkommen, Projekte, Einstellungen) mit Dot-Navigation
- ✅ **6.3** Hilfe-Button pro Karte — `?`-Icon in jedem Karten-Header, öffnet Hilfe mit Anker-Navigation

---

## Paket 7 — Karten-Sichtbarkeit & Presets ✅
- ✅ **7.1** Karten ein-/ausblenden — Dropdown-Menü im Header mit Toggles pro Karte + `.card-hidden` Klasse
- ✅ **7.2** Kompaktmodus — `[data-compact="true"]` Toggle für reduziertes Padding + kleinere Schrift
- ✅ **7.3** Dashboard-Presets — "Minimal" / "Standard" / "Alle" Buttons im Visibility-Menü

---

## Paket 8 — Tastaturkürzel ✅
- ✅ **8.1** Keyboard-Shortcuts — Space/P=Pause, Esc=Modal schließen, N=Neues Projekt, S=Settings, H=Hilfe
- ✅ **8.2** Ziffern 1-9 = Favorit starten — Schnellzugriff nach Position
- ✅ **8.3** Shortcut-Übersicht — `?`-Taste zeigt Overlay mit allen Kürzeln

---

## Paket 9 — Datenqualität & Schutz ✅
- ✅ **9.1** Zeitüberlappungs-Warnung — Gelbes Warn-Banner im Timesheet bei sich überlappenden Einträgen
- ✅ **9.2** Undo-Mechanismus — Rückgängig-Toast nach Projekt löschen und Feierabend (max 5 Stack)
- ✅ **9.3** Validierung bei Zeitbearbeitung — showAlert bei ungültigen Zeiten + Re-Render

---

## Paket 10 — Wochensumme & Timesheet-Polish ✅
- ✅ **10.1** Wochen-Soll-Fortschritt — Summary-Bar über Wochenübersicht mit Stunden/Ziel + Fortschrittsbalken
- ✅ **10.2** Notiz-Vorlagen — Schnellauswahl-Chips (Besprechung, Code Review, Testing, etc.) über Notiz-Input

---

## Paket 11 — Accessibility & Mobile ✅
- ✅ **11.1** ARIA-Labels — Automatisch aus `data-tooltip`/`title` propagiert, `applyAriaLabels()` nach jedem Render
- ✅ **11.2** Focus-Visible-Styles — Keyboard-Focus mit Primary-Color-Outline für alle interaktiven Elemente
- ✅ **11.3** Mobile Touch-Optimierung — Min 44px Touch-Targets, größere List-Items und Buttons auf Mobile

---

## Paket 12 — Empty States & Onboarding-Polish ✅
- ✅ **12.1** Leere Karten mit Icon + CTA — Material-Empty-States für Favoriten, Andere Projekte, Archiv
- ✅ **12.2** "Allgemein"-Projekt erklären — Info-Icon mit Tooltip neben Projektname

---

## Hinweise
- **Reihenfolge**: Sichtbarer Nutzen → Fundament stärken → Komfort → Polish
- **Datei**: `TimeFlo_3.0.html` (Single-File-App, ~5300+ Zeilen)
- **Speicherung**: localStorage (JSON)
- **Tech**: Vanilla JS, CSS3 mit CSS-Variablen (Material Design 3), kein Framework
