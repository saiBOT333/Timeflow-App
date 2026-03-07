// =============================================================================
// config.js – Globale Konstanten (APP_VERSION, Paletten, Changelog)
// =============================================================================
// Alle Werte hier sind unveränderlich (const) und werden von anderen Modulen
// per import { ... } from './config.js' gelesen.
// =============================================================================

// --- VERSION ---
export const APP_VERSION = '3.4.0';

// --- DEFAULT-KONFIGURATION ---
export const DEFAULT_AUTO_PAUSES = [
    { start: "09:00", end: "09:20", label: "Frühstück" },
    { start: "11:30", end: "12:10", label: "Mittag" }
];

// --- FARBPALETTE ---
export const MATERIAL_PALETTE = [
    '#F2B8B5', '#E6B8E8', '#D0BCFF', '#BCC5FC', '#A8C7FA', '#A3DDF9',
    '#A0E2EC', '#9EE5DB', '#A4E3AC', '#C3E794', '#E2E78D', '#FBE48D',
    '#FFDB90', '#FFCCBC'
];

export const ARCHIVE_COLOR = '#757575';

// --- CHANGELOG ---
// Für jede neue Version hier einen Eintrag ergänzen.
// Das Popup erscheint automatisch beim nächsten Start, wenn APP_VERSION
// noch nicht als gesehen gespeichert ist.
export const CHANGELOG = {
    '3.4.0': {
        title: 'Version 3.4.0',
        subtitle: 'Auto-Pause-Overhaul & CSS-Refactoring',
        changes: [
            { icon: 'smart_toy',        text: 'Auto-Pausen: 4 Grundfehler behoben – kein Default-Revival, korrekte Zeitzone, kollisionsfreie Erkennung' },
            { icon: 'schedule',         text: 'Auto-Pausen: Neue Pausen mit vergangener Startzeit greifen erst ab morgen – Badge „ab morgen" zeigt das an' },
            { icon: 'skip_next',        text: 'Auto-Pausen: „Jetzt beenden"-Button im Pause-Banner stoppt eine laufende Auto-Pause sofort' },
            { icon: 'tune',             text: 'Auto-Pausen: Zeiteingabe jetzt als Dropdown (5-Min-Raster) – kein manuelles Tippen mehr nötig' },
            { icon: 'bug_report',       text: 'Bugfix: Pause-Banner (manuell & automatisch) erscheint wieder korrekt im Aktivitätsbereich' },
            { icon: 'bug_report',       text: 'Bugfix: Löschen-Button für manuelle Pausen im Stundenzettel funktioniert wieder' },
            { icon: 'bug_report',       text: 'Bugfix: Zeitenberechnung in der Wochenübersicht korrigiert – Summen werden jetzt korrekt zusammengerechnet' },
            { icon: 'dark_mode',        text: 'Dark Theme: Aktive Projekte und markierte Wochenzeilen jetzt mit farbigem Akzent hervorgehoben' },
            { icon: 'palette',          text: 'Design: Visuelle Verbesserungen und Vereinheitlichung des Erscheinungsbilds in Light & Dark Theme' },
            { icon: 'download',         text: 'CSV-Export: Zeiten werden je nach gewähltem Format (Dezimal oder Stunden) korrekt ausgegeben' }
        ]
    },
    '3.3.0': {
        title: 'Version 3.3.0',
        subtitle: 'Banner-Layout & Verbesserungen',
        changes: [
            { icon: 'view_day',         text: 'Aktivitätsbereich: Im Breit-Modus jetzt als horizontales Banner – Nummer & Name links, Timer in der Mitte, Gesamt & Buttons rechts' },
            { icon: 'notifications',    text: 'Erinnerungen im Breit-Modus horizontal dargestellt – kein gedrungenes Layout mehr' },
            { icon: 'coffee',           text: 'Pause-Zustand im Breit-Modus als kompakter Chip in der linken Sektion' },
            { icon: 'system_update',    text: 'PWA-Update-Erkennung zuverlässiger: reg.update() bei jedem Start erzwingt sofortige Prüfung' },
            { icon: 'bug_report',       text: 'Bugfix: Projektnummer-Spalte (#) in Wochenübersicht auf 72 px verbreitert – lange Nummern immer vollständig lesbar' }
        ]
    },
    '3.2.0': {
        title: 'Version 3.2.0',
        subtitle: 'UI-Verbesserungen & neue Features',
        changes: [
            { icon: 'table_rows',          text: 'Stundenzettel: Projektnummer unterhalb des Namens – immer lesbar, auch bei langen Namen mit Unterprojekt' },
            { icon: 'tag',                 text: 'Wochenübersicht: Projektnummer in eigener Spalte, klar und immer sichtbar' },
            { icon: 'dashboard_customize', text: 'Fortschrittsanzeige & Externe Links jetzt fest in einer Reihe – über "Sichtbare Karten" ein-/ausschaltbar' },
            { icon: 'link',                text: 'Externe Links als kompakte Buttons neben der Fortschrittsanzeige (max. 4 Links)' },
            { icon: 'new_releases',        text: 'PWA: Automatische Update-Benachrichtigung nach dem Programmstart' },
            { icon: 'download',            text: 'CSV-Export: Gibt jetzt die Wochendaten aus – Projekt pro Zeile mit Tagesspalten und Gesamtsumme' },
            { icon: 'bug_report',          text: 'Bugfix: Abstand zwischen #-Spalte und Projektname in der Wochenübersicht korrigiert' },
            { icon: 'bug_report',          text: 'Bugfix: Einklapp-Buttons mussten beim ersten Start zweimal betätigt werden' }
        ]
    },
    '3.1.0': {
        title: 'Version 3.1.0',
        subtitle: 'Verbesserungen & Bugfixes',
        changes: [
            { icon: 'coffee',          text: 'Pausen werden im Stundenzettel in der Timeline angezeigt' },
            { icon: 'tag',             text: 'Projektnummer im Stundenzettel sichtbar' },
            { icon: 'percent',         text: 'Wochenübersicht zeigt Zeiten jetzt auch im Dezimalformat' },
            { icon: 'text_fields',     text: 'Bugfix: Lange Projektnamen laufen nicht mehr über die Karte hinaus – abgeschnittene Namen per Hover sichtbar' },
            { icon: 'info',            text: 'Versionsnummer jetzt in den Einstellungen sichtbar' }
        ]
    },
    '3.0.0': {
        title: 'Version 3.0.0',
        subtitle: 'Erste offizielle Version mit Versionierung',
        changes: [
            { icon: 'install_mobile',  text: 'PWA: App kann jetzt als eigenständige App auf dem Gerät installiert werden' },
            { icon: 'smartphone',      text: 'Mobile-Optimierungen: Layout auf kleinen Bildschirmen deutlich verbessert' },
            { icon: 'menu_book',       text: 'Benutzerhandbuch mit neuen SVG-Illustrationen vollständig überarbeitet' },
            { icon: 'new_releases',    text: 'Versionierung eingeführt – du siehst beim nächsten Update, was neu ist' }
        ]
    }
};
