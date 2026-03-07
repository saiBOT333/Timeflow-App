// =============================================================================
// state.js – Persistierter App-State und ephemerer UI-State
// =============================================================================
// state    → wird in IndexedDB gespeichert und beim Start geladen (storage.js)
// uiState  → lebt nur im RAM; kein Neustart-Überleben, nie persistiert
//
// Beide sind const-Objekte: Eigenschaften dürfen mutiert werden,
// die Objekte selbst werden nie neu zugewiesen.
// =============================================================================

// --- HAUPT-STATE (persistiert) ---
export const state = {
    version: 2,
    projects: [],
    pauses: [],
    tags: [],
    manualPauseActive: false,
    settings: {
        filePrefix: 'TimeFlow_Export',
        rounding: '0', // Default: Exact (0)
        theme: 'dark',
        greeting: 'Guten Morgen! Bereit für einen produktiven Tag? 🚀',
        progressEnabled: true,
        workdayHours: 10,
        yellowPct: 60,
        redPct: 85,
        timerMode: 'standard',
        reminders: [],
        autoPauses: [],
        showWeekend: true,
        homeOffice: false,
        hiddenCards: [],
        compactMode: false,
        // Reihenfolge und Breite der Karten im Grid (Single Source of Truth für Layout).
        // Jeder Eintrag: { id: string, wide: boolean }
        // Entspricht exakt der Render-Reihenfolge; DOM wird daraus gebaut, nie umgekehrt.
        cardLayout: [
            { id: 'card-new',       wide: false },
            { id: 'card-active',    wide: false },
            { id: 'card-favorites', wide: false },
            { id: 'card-others',    wide: false },
            { id: 'card-pauses',    wide: false },
            { id: 'card-weekly',    wide: true  },
            { id: 'card-links',     wide: false },
            { id: 'card-timesheet', wide: true  },
            { id: 'card-archive',   wide: false }
        ]
    },
    customTitles: {
        'title_progress':   'Fortschrittsanzeige',
        'title_new':        'Neues Projekt',
        'title_active':     'Aktivitätsbereich',
        'title_favorites':  'Favoriten',
        'title_others':     'Andere Kostenstellen',
        'title_pauses':     'Pausen',
        'title_archive':    'Archiv',
        'title_weekly':     'Wochenübersicht',
        'title_links':      'Externe Links',
        'title_timesheet':  'Timesheet'
    }
};

// --- UI-STATE (ephemeral, not persisted) ---
// Alle Laufzeit-Zustände die keinen App-Neustart überleben sollen.
export const uiState = {
    // Navigation
    viewDate:            new Date().toISOString().split('T')[0],  // aktuell betrachteter Tag (Pausen/Logs)
    viewWeekStart:       (() => {
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
        return monday.toISOString().split('T')[0];
    })(),  // Montag der aktuell betrachteten Woche

    // Tag-Filter
    filterTagId:         null,   // aktuell aktiver Tag-Filter (string|null)

    // Collapsed-State der Hauptkarten (Set mit card-IDs, z.B. 'card-archive')
    collapsedCards:      new Set(),

    // Collapsed-State von Elternprojekten in der Hauptliste
    collapsedParents:    new Set(),

    // Collapsed-State von Elternprojekten in der Wochenübersicht
    collapsedWeeklyParents: new Set(),

    // Markierte Zeilen in der Wochenübersicht (project-id)
    weeklyMarkedRows:    new Set(),

    // Dezimaldarstellung in der Wochenübersicht (true = h.hh, false = hh:mm)
    weeklyDecimal:       false,

    // Offenes Projekt-Kontextmenü (project-id|null)
    openMenuProjectId:   null,

    // Aktuell im Modal bearbeitetes Projekt (project-id|null)
    // Wird von openProjectEdit, openSubProjectModal, openTimeEdit, openTagAssign gesetzt.
    editingProjectId:    null
};
