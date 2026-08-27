// =============================================================================
// config.js – Globale Konstanten (APP_VERSION, Paletten, Changelog)
// =============================================================================
// Alle Werte hier sind unveränderlich (const) und werden von anderen Modulen
// per import { ... } from './config.js' gelesen.
// =============================================================================

// --- VERSION ---
export const APP_VERSION = '3.6.0';

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
    '3.6.0': {
        title: 'Version 3.6.0',
        subtitle: 'Jeder Tag steht f\u00fcr sich',
        changes: [
            { icon: 'today',        text: 'Tagesgrenze: Um 00:00 Uhr ist Schluss \u2013 eine Aktivit\u00e4t l\u00e4uft nie mehr in den n\u00e4chsten Tag hinein.' },
            { icon: 'schedule',     text: 'Vergessener Feierabend: Beim n\u00e4chsten Start wird die offene Aktivit\u00e4t automatisch beendet \u2013 zu dem Zeitpunkt, an dem TimeFlow zuletzt lief, nicht erst um Mitternacht.' },
            { icon: 'info',         text: 'Hinweis \u201eNicht abgestochen\u201c zeigt, was korrigiert wurde, und springt auf Wunsch direkt in den Stundenzettel des betroffenen Tages.' },
            { icon: 'restart_alt',  text: 'Der neue Tag startet frisch bei 0 \u2013 \u201eAllgemein\u201c l\u00e4uft ab dem Programmstart, auch nach Standby oder Ruhezustand.' },
            { icon: 'coffee',       text: 'Eine laufende manuelle Pause aus dem Vortag wird ebenfalls sauber beendet.' },
            { icon: 'delete',       text: 'Einstellung \u201eAutomatischer Tagesabschluss\u201c entfernt \u2013 die Tagesgrenze erledigt das jetzt zuverl\u00e4ssig.' },
            { icon: 'content_copy', text: 'Wochen\u00fcbersicht: Klick auf die Projektnummer kopiert sie in die Zwischenablage \u2013 mit kurzer Best\u00e4tigung am Button.' },
            { icon: 'keyboard',     text: 'Timesheet: Zeiten lassen sich wieder per Tastatur eintippen \u2013 die Eingabe wird nicht mehr nach der ersten Ziffer abgebrochen. Dauer und Tagessumme ziehen dabei live mit.' },
            { icon: 'swap_horiz',   text: 'Timesheet: Auch der laufende Eintrag l\u00e4sst sich einem anderen Projekt zuordnen \u2013 er wandert mitsamt Startzeit und Notiz mit und l\u00e4uft dort weiter, statt das Zielprojekt neu zu starten.' },
            { icon: 'bug_report',   text: 'Bugfix: Zwischen 0 und 2 Uhr nachts zeigten Timesheet, Wochen\u00fcbersicht und Fortschritt noch den Vortag \u2013 alle Tagesberechnungen laufen jetzt durchg\u00e4ngig in lokaler Zeit.' }
        ]
    },
    '3.5.0': {
        title: 'Version 3.5.0',
        subtitle: 'Backup-Ordner & Stundenzettel-Erweiterungen',
        changes: [
            { icon: 'folder',     text: 'Backup-Ordner: Beim Feierabend lässt sich jetzt ein fester Ordner wählen, in den das Backup automatisch geschrieben wird (Chrome/Edge). Ohne Ordner landet es wie bisher im Download-Ordner.' },
            { icon: 'swap_horiz', text: 'Stundenzettel: Projekt eines Eintrags per Klick auf den Projektnamen wechseln.' },
            { icon: 'add_circle', text: 'Stundenzettel: Manuelle Zeiteinträge mit Start, Ende und Notiz direkt anlegen.' },
            { icon: 'delete',     text: 'Stundenzettel: Auch laufende Einträge lassen sich verwerfen – mit eigener Sicherheitsabfrage.' },
            { icon: 'schedule',   text: 'Stundenzettel: Zeiteingabe über native Uhrzeit-Felder – bequemer und fehlerärmer.' },
            { icon: 'percent',    text: 'Budget-Balken: Rechnet jetzt netto (abzüglich Pausen) – stimmt mit der angezeigten Gesamtsumme überein.' },
            { icon: 'tune',       text: 'Wochenübersicht: Dezimalformat ist beim Start jetzt Standard – Umschalten auf HH:MM per Klick bleibt möglich.' },
            { icon: 'healing',    text: 'Bugfix: Projekte, die fälschlich als „läuft" hängen blieben, werden beim Laden automatisch korrigiert.' }
        ]
    },
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
