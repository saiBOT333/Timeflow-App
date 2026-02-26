        // --- VERSION ---
        const APP_VERSION = '3.3.0';

        // --- CONFIG ---
        const DEFAULT_AUTO_PAUSES = [
            { start: "09:00", end: "09:20", label: "Frühstück" },
            { start: "11:30", end: "12:10", label: "Mittag" }
        ];

        const MATERIAL_PALETTE = [
            '#F2B8B5', '#E6B8E8', '#D0BCFF', '#BCC5FC', '#A8C7FA', '#A3DDF9', 
            '#A0E2EC', '#9EE5DB', '#A4E3AC', '#C3E794', '#E2E78D', '#FBE48D', 
            '#FFDB90', '#FFCCBC'
        ];
        
        const ARCHIVE_COLOR = '#757575';

        // --- CHANGELOG ---
        // Für jede neue Version hier einen Eintrag ergänzen.
        // Das Popup erscheint automatisch beim nächsten Start, wenn APP_VERSION
        // noch nicht als gesehen gespeichert ist.
        const CHANGELOG = {
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

        // --- STATE ---
        const state = {
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
                'title_progress': 'Fortschrittsanzeige',
                'title_new': 'Neues Projekt',
                'title_active': 'Aktivitätsbereich',
                'title_favorites': 'Favoriten',
                'title_others': 'Andere Kostenstellen',
                'title_pauses': 'Pausen',
                'title_archive': 'Archiv',
                'title_weekly': 'Wochenübersicht',
                'title_links': 'Externe Links',
                'title_timesheet': 'Timesheet'
            }
        };

        // --- PENDING SETTINGS (Live-Spiegel des Einstellungs-Dialogs, nicht persistiert) ---
        // Wird beim Öffnen des Settings-Modals aus state befüllt und bei jedem Input-Event
        // synchronisiert. saveSettings() flusht pendingSettings → state, liest nie DOM.
        let pendingSettings = {};

        // Current editing project
        let editingProjectId = null;

        // Greeting animation state (runtime only)
        let greetingShown = false;
        let greetingAnimationRunning = false;

        // Reminder state (runtime only - tracks which reminders fired today)
        let firedRemindersToday = {};  // key: "HH:MM-text" → true
        let activeReminder = null;     // currently displayed reminder
        let activeReminderIndex = -1;  // index of the currently displayed reminder (for one-time deletion)

        // Feierabend state
        let feierabendActive = false;

        // Undo stack (runtime only, max 5)
        let undoStack = [];
        let undoToastTimeout = null;

        // Day start time (for progress bar)
        let dayStartTime = null;

        // Auto-Pauses-Panel offen/geschlossen (runtime only — ersetzt DOM-Class-Abfrage)
        let autoPausesPanelOpen = false;

        // --- UI-STATE (ephemeral, not persisted to localStorage) ---
        // Alle Laufzeit-Zustände die keinen App-Neustart überleben sollen.
        const uiState = {
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

            // Dezimaldarstellung in der Wochenübersicht (true = h.hh, false = hh:mm)
            weeklyDecimal:       false,

            // Offenes Projekt-Kontextmenü (project-id|null)
            openMenuProjectId:   null
        };

        // --- STORAGE MANAGER (IndexedDB-Wrapper) ---
        // Kapselt alle Datenbankoperationen. Schnittstelle nach außen:
        //   StorageManager.init()  → Promise<void>   — DB öffnen + ggf. localStorage migrieren
        //   StorageManager.get()   → Promise<object|null>
        //   StorageManager.set(v)  → Promise<void>
        //
        // Intern: IndexedDB "TimeFlowDB", ObjectStore "kv", Key "state".
        // Beim ersten Start: Daten aus localStorage('tf_state') werden 1:1 übernommen
        // und anschließend aus dem localStorage entfernt (einmalige Migration).
        const StorageManager = (() => {
            const DB_NAME    = 'TimeFlowDB';
            const DB_VERSION = 1;
            const STORE      = 'kv';
            const KEY        = 'state';
            const LS_KEY     = 'tf_state';          // alter localStorage-Schlüssel

            let _db = null;                          // gecachte IDB-Instanz

            /** Öffnet die DB (lazy singleton). Gibt immer dasselbe Promise zurück. */
            function _open() {
                if (_db) return Promise.resolve(_db);
                return new Promise((resolve, reject) => {
                    const req = indexedDB.open(DB_NAME, DB_VERSION);
                    req.onupgradeneeded = (e) => {
                        const db = e.target.result;
                        if (!db.objectStoreNames.contains(STORE)) {
                            db.createObjectStore(STORE);
                        }
                    };
                    req.onsuccess  = (e) => { _db = e.target.result; resolve(_db); };
                    req.onerror    = (e) => reject(e.target.error);
                });
            }

            /** Liest den gespeicherten State aus IndexedDB. */
            function get() {
                return _open().then(db => new Promise((resolve, reject) => {
                    const tx  = db.transaction(STORE, 'readonly');
                    const req = tx.objectStore(STORE).get(KEY);
                    req.onsuccess = (e) => resolve(e.target.result ?? null);
                    req.onerror   = (e) => reject(e.target.error);
                }));
            }

            /** Schreibt den State in IndexedDB. */
            function set(value) {
                return _open().then(db => new Promise((resolve, reject) => {
                    const tx  = db.transaction(STORE, 'readwrite');
                    const req = tx.objectStore(STORE).put(value, KEY);
                    req.onsuccess = () => resolve();
                    req.onerror   = (e) => reject(e.target.error);
                }));
            }

            /**
             * Initialisiert die DB und führt einmalig die localStorage→IDB-Migration durch.
             * Danach ist der localStorage-Key 'tf_state' leer (entfernt).
             * Gibt true zurück wenn Daten (aus IDB oder migriertem LS) vorhanden sind.
             */
            async function init() {
                await _open();

                // Prüfen ob noch Daten im alten localStorage liegen
                const lsRaw = localStorage.getItem(LS_KEY);
                if (lsRaw) {
                    try {
                        const parsed = JSON.parse(lsRaw);
                        // Nur migrieren wenn IDB noch leer ist (Schutz vor Überschreiben)
                        const existing = await get();
                        if (!existing) {
                            await set(parsed);
                            console.info('[Storage] localStorage→IndexedDB Migration abgeschlossen.');
                        }
                        // localStorage-Eintrag entfernen (unabhängig davon ob wir migriert haben)
                        localStorage.removeItem(LS_KEY);
                        console.info('[Storage] tf_state aus localStorage entfernt.');
                    } catch (e) {
                        console.warn('[Storage] Migration fehlgeschlagen:', e);
                    }
                }
            }

            return { init, get, set };
        })();

        // --- AUTO PAUSES HELPER ---
        function getAutoPauses() {
            // Use configured auto-pauses, or migrate from defaults if not yet configured
            if (!state.settings.autoPauses || state.settings.autoPauses.length === 0) {
                state.settings.autoPauses = JSON.parse(JSON.stringify(DEFAULT_AUTO_PAUSES));
            }
            return state.settings.autoPauses;
        }

        function renderAutoPausesDisplay() {
            const container = document.getElementById('autoPausesDisplay');
            if (!container) return;
            const pauses = getAutoPauses();
            const isHO = state.settings.homeOffice;

            // Update toggle button label with pause count
            const toggleLabel = document.getElementById('autoPausesToggleLabel');
            if (toggleLabel) {
                const count = pauses.length;
                const hoHint = isHO ? ' (deaktiviert)' : '';
                toggleLabel.textContent = count > 0
                    ? `Auto-Pausen (${count})${hoHint}`
                    : 'Auto-Pausen konfigurieren';
            }

            if (pauses.length === 0) {
                container.innerHTML = `<div class="auto-pause-empty">
                    <span class="material-symbols-rounded" style="font-size:16px; opacity:0.5;">schedule_off</span>
                    <span>Keine automatischen Pausen konfiguriert.</span>
                    <button class="auto-pause-add-btn" onclick="addAutoPause()">
                        <span class="material-symbols-rounded" style="font-size:14px;">add</span> Hinzufügen
                    </button>
                </div>`;
                return;
            }

            let html = '<div class="auto-pause-list">';
            html += isHO ? `<div style="font-size:11px; color:var(--md-sys-color-error); opacity:0.8; margin-bottom:6px; display:flex; align-items:center; gap:4px;">
                <span class="material-symbols-rounded" style="font-size:14px;">info</span> Home Office aktiv — automatische Pausen werden heute nicht ausgelöst
            </div>` : '';

            pauses.forEach((ap, i) => {
                html += `<div class="auto-pause-row ${isHO ? 'disabled' : ''}">
                    <input type="text" class="auto-pause-time-input" value="${ap.start}"
                        onchange="updateAutoPause(${i}, 'start', this.value)" title="Startzeit">
                    <span style="opacity:0.4;">–</span>
                    <input type="text" class="auto-pause-time-input" value="${ap.end}"
                        onchange="updateAutoPause(${i}, 'end', this.value)" title="Endzeit">
                    <input type="text" class="auto-pause-label-input" value="${escapeHtml(ap.label)}"
                        onchange="updateAutoPause(${i}, 'label', this.value)" placeholder="Bezeichnung">
                    <button class="icon-btn" style="width:24px; height:24px; color:var(--md-sys-color-error); opacity:0.5;"
                        onclick="removeAutoPause(${i})" title="Automatische Pause entfernen">
                        <span class="material-symbols-rounded" style="font-size:16px;">close</span>
                    </button>
                </div>`;
            });

            html += `<button class="auto-pause-add-btn" onclick="addAutoPause()">
                <span class="material-symbols-rounded" style="font-size:14px;">add</span> Pause hinzufügen
            </button>`;
            html += '</div>';
            container.innerHTML = html;
        }

        function updateAutoPause(index, field, value) {
            const pauses = getAutoPauses();
            if (!pauses[index]) return;
            if (field === 'start' || field === 'end') {
                // Validate HH:MM format
                if (!/^\d{2}:\d{2}$/.test(value)) return;
            }
            pauses[index][field] = value.trim();
            state.settings.autoPauses = pauses;
            saveData();
            updateUI();
        }

        function addAutoPause() {
            const pauses = getAutoPauses();
            pauses.push({ start: '12:00', end: '12:30', label: 'Pause' });
            state.settings.autoPauses = pauses;
            saveData();
            updateUI();
        }

        async function removeAutoPause(index) {
            const pauses = getAutoPauses();
            if (!pauses[index]) return;
            const ok = await showConfirm(`Automatische Pause „${pauses[index].label}" entfernen?`, {
                title: 'Pause entfernen', icon: 'delete', okText: 'Entfernen', danger: true
            });
            if (!ok) return;
            pauses.splice(index, 1);
            state.settings.autoPauses = pauses;
            saveData();
            updateUI();
        }

        function toggleAutoPausesPanel() {
            // State-Variable statt DOM-Class-Abfrage (kein DOM als Source of Truth)
            autoPausesPanelOpen = !autoPausesPanelOpen;
            const panel = document.getElementById('autoPausesDisplay');
            const btn = document.querySelector('.auto-pause-toggle-btn');
            panel.style.display = autoPausesPanelOpen ? 'block' : 'none';
            if (btn) btn.classList.toggle('open', autoPausesPanelOpen);
            // Inhalt beim Öffnen lazy rendern
            if (autoPausesPanelOpen) renderAutoPausesDisplay();
            layoutMasonry();
        }

        // --- THEME ---
        function toggleTheme() {
            state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
            applyTheme();
            saveData();
            updateUI();
        }

        function applyTheme() {
            const theme = state.settings.theme || 'dark';
            document.documentElement.setAttribute('data-theme', theme);
            const btn = document.getElementById('themeToggleBtn');
            if (btn) {
                btn.querySelector('.material-symbols-rounded').textContent =
                    theme === 'dark' ? 'light_mode' : 'dark_mode';
            }
        }

        // --- INIT ---
        async function init() {
            // loadData() ist jetzt async: öffnet IDB, migriert ggf. aus localStorage, lädt State.
            // Erst danach sind state.projects / state.settings korrekt befüllt.
            await loadData();

            // isFirstVisit: kein gespeicherter State vorhanden UND noch kein Onboarding.
            // Nach der Migration enthält state.projects ggf. bereits Daten vom alten localStorage,
            // daher prüfen wir auf leere Projektliste statt auf den alten localStorage-Key.
            const isFirstVisit = state.projects.length === 0 && localStorage.getItem('tf_onboarded') !== 'true';

            applyTheme();
            setupPWA();

            const existingGeneral = state.projects.find(p => p.id === 'general');
            if (!existingGeneral) {
                state.projects.push({
                    id: 'general',
                    number: 'SYS',
                    name: 'Allgemein',
                    category: 'active',
                    isFavorite: false,
                    color: MATERIAL_PALETTE[4],
                    status: 'running',
                    logs: [{ start: Date.now(), end: null }],
                    tagIds: []
                });
            } else {
                // Ensure general project is running on app start
                // If no project is currently running, auto-start general
                const anyRunning = state.projects.find(p => p.status === 'running');
                if (!anyRunning) {
                    existingGeneral.status = 'running';
                    existingGeneral.logs.push({ start: Date.now(), end: null });
                }
            }
            
            // Initialize day start time for progress bar
            // Use stored value if same day, otherwise set to now
            const storedDayStart = localStorage.getItem('tf_dayStart');
            const storedDayDate = localStorage.getItem('tf_dayStartDate');
            const todayISO = new Date().toISOString().split('T')[0];
            if (storedDayStart && storedDayDate === todayISO) {
                dayStartTime = parseInt(storedDayStart);
            } else {
                dayStartTime = Date.now();
                localStorage.setItem('tf_dayStart', dayStartTime.toString());
                localStorage.setItem('tf_dayStartDate', todayISO);
            }

            applyTitles();
            applyCompactMode();
            // Collapsed-Zustand aus dem HTML-Default in uiState synchronisieren,
            // damit toggleCard() beim ersten Klick sofort reagiert.
            document.querySelectorAll('#cardGrid .md-card.collapsed').forEach(card => {
                if (card.id) uiState.collapsedCards.add(card.id);
            });
            updateDateDisplay();
            updateHomeOfficeBtn();
            updateUI();
            // Update auto-pause toggle label (panel stays closed, but label shows count)
            renderAutoPausesDisplay();
            // Show greeting animation (overlays the active card after initial render)
            if (!greetingShown) {
                showGreeting();
            }
            setupDragAndDrop();
            setInterval(tick, 1000);

            // Re-layout masonry on window resize
            window.addEventListener('resize', () => layoutMasonry());

            // Onboarding for first-time users; Changelog for returning users
            if (isFirstVisit) {
                showOnboarding();
                // Neue Nutzer sehen das Onboarding – Changelog-Popup sofort als gesehen markieren.
                localStorage.setItem('tf_version_seen', APP_VERSION);
            } else {
                checkAndShowChangelog();
            }

            // Escape key: close modals and menus
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const modals = document.querySelectorAll('.modal-overlay:not(.hidden)');
                    if (modals.length > 0) modals[modals.length - 1].classList.add('hidden');
                    closeAllProjectMenus();
                }
            });

            // Paket 11: Apply ARIA labels
            applyAriaLabels();
        }

        // --- PAKET 6.2: Onboarding ---
        let onboardingStep = 0;
        const onboardingSteps = [
            { icon: 'waving_hand', title: 'Willkommen bei TimeFlow!', text: 'TimeFlow erfasst deine Arbeitszeit automatisch. Das Projekt \u00ABAllgemein\u00BB l\u00E4uft bereits.', btn: 'Weiter' },
            { icon: 'add_circle', title: 'Projekte anlegen', text: 'Lege oben neue Projekte an. Klicke auf ein Projekt um es zu starten. Das aktive Projekt wird im Aktivit\u00E4tsbereich angezeigt.', btn: 'Weiter' },
            { icon: 'tune', title: 'Alles konfigurierbar', text: 'In den Einstellungen kannst du Pausen, Erinnerungen, Links und vieles mehr anpassen. Viel Spa\u00DF!', btn: 'Los geht\u2019s' }
        ];

        function showOnboarding() {
            onboardingStep = 0;
            updateOnboardingUI();
            document.getElementById('onboardingOverlay').classList.remove('hidden');
        }

        function updateOnboardingUI() {
            const step = onboardingSteps[onboardingStep];
            document.getElementById('onboardingIcon').textContent = step.icon;
            document.getElementById('onboardingTitle').textContent = step.title;
            document.getElementById('onboardingText').textContent = step.text;
            document.getElementById('onboardingBtn').textContent = step.btn;
            for (let i = 0; i < 3; i++) {
                document.getElementById('onbDot' + i).classList.toggle('active', i === onboardingStep);
            }
        }

        function advanceOnboarding() {
            onboardingStep++;
            if (onboardingStep >= onboardingSteps.length) {
                localStorage.setItem('tf_onboarded', 'true');
                document.getElementById('onboardingOverlay').classList.add('hidden');
                return;
            }
            updateOnboardingUI();
        }

        // --- CHANGELOG POPUP ---
        function checkAndShowChangelog() {
            const lastSeen = localStorage.getItem('tf_version_seen');
            if (lastSeen === APP_VERSION) return;
            const entry = CHANGELOG[APP_VERSION];
            if (!entry) {
                // Kein Eintrag für diese Version → trotzdem als gesehen markieren
                localStorage.setItem('tf_version_seen', APP_VERSION);
                return;
            }
            showChangelogModal(entry);
        }

        function showChangelogModal(entry) {
            document.getElementById('changelogTitle').textContent = entry.title;
            document.getElementById('changelogSubtitle').textContent = entry.subtitle || '';
            const list = document.getElementById('changelogList');
            list.innerHTML = entry.changes.map(c =>
                `<div style="display:flex; align-items:flex-start; gap:12px;">
                    <span class="material-symbols-rounded" style="font-size:20px; color:var(--md-sys-color-primary); flex-shrink:0; margin-top:1px;">${c.icon}</span>
                    <span style="font-size:14px; color:var(--md-sys-color-on-surface-variant); line-height:1.5;">${c.text}</span>
                </div>`
            ).join('');
            openModal('changelogModal');
        }

        function dismissChangelog() {
            localStorage.setItem('tf_version_seen', APP_VERSION);
            closeModal('changelogModal');
        }

        // --- PAKET 11: ARIA Labels ---
        function applyAriaLabels() {
            // Buttons with data-tooltip get aria-label from tooltip
            document.querySelectorAll('[data-tooltip]').forEach(el => {
                if (!el.getAttribute('aria-label')) {
                    el.setAttribute('aria-label', el.getAttribute('data-tooltip'));
                }
            });
            // Buttons with title get aria-label from title
            document.querySelectorAll('button[title]:not([aria-label])').forEach(el => {
                el.setAttribute('aria-label', el.getAttribute('title'));
            });
            // Specific buttons
            const pauseBtn = document.getElementById('manualPauseBtn');
            if (pauseBtn) pauseBtn.setAttribute('aria-label', 'Manuelle Pause');
        }

        function applyTitles() {
            for (const [key, value] of Object.entries(state.customTitles)) {
                const el = document.querySelector(`[onblur*="${key}"]`);
                if(el && value) el.innerText = value;
            }
        }

        function saveTitle(el, key) {
            const newText = el.innerText.trim();
            if(newText) {
                state.customTitles[key] = newText;
                saveData();
            } else {
                el.innerText = state.customTitles[key];
            }
        }

        // --- SETTINGS & MODALS LOGIC ---
        function openModal(id, options) {
            if(id === 'settingsModal') {
                // 1. pendingSettings aus state befüllen (Single Source of Truth)
                pendingSettings = {
                    filePrefix:      state.settings.filePrefix || 'TimeFlow_Export',
                    rounding:        state.settings.rounding !== undefined ? state.settings.rounding : '0',
                    greeting:        state.settings.greeting || '',
                    progressEnabled: state.settings.progressEnabled !== false,
                    workdayHours:    state.settings.workdayHours || 10,
                    yellowPct:       state.settings.yellowPct || 60,
                    redPct:          state.settings.redPct || 85,
                    externalLinks:   JSON.parse(JSON.stringify(state.settings.externalLinks || []))
                };

                // 2. DOM-Formular aus pendingSettings initialisieren (DOM nur schreiben, nie lesen)
                document.getElementById('settingsPrefix').value = pendingSettings.filePrefix;
                document.getElementById('settingsRounding').value = pendingSettings.rounding;
                document.getElementById('settingsGreeting').value = pendingSettings.greeting;
                document.getElementById('settingsProgressEnabled').checked = pendingSettings.progressEnabled;
                document.getElementById('settingsWorkdayHours').value = pendingSettings.workdayHours;
                document.getElementById('settingsYellowPct').value = pendingSettings.yellowPct;
                document.getElementById('settingsRedPct').value = pendingSettings.redPct;
                renderReminderListSettings();
                renderExternalLinksSettings();
                const versionLabel = document.getElementById('settingsVersionLabel');
                if (versionLabel) versionLabel.textContent = 'v' + APP_VERSION;
                // Switch to requested tab or default to general
                const tab = (options && options.tab) || 'tab-general';
                const tabBtn = document.querySelector(`.settings-tab[data-tab="${tab}"]`);
                if (tabBtn) switchSettingsTab(tab, tabBtn);
                setTimeout(updateProgressPreview, 50);
            }
            document.getElementById(id).classList.add('open');
        }

        function closeModal(id) {
            document.getElementById(id).classList.remove('open');
            if (id === 'tagAssignModal' || id === 'projectEditModal' || id === 'timeEditModal' || id === 'subProjectModal') editingProjectId = null;
            if (id === 'helpModal') document.getElementById('helpIframe').src = '';
        }

        // --- CUSTOM CONFIRM / ALERT ---
        let _confirmResolve = null;

        function showConfirm(message, { title = 'Bestätigung', icon = 'help_outline', okText = 'OK', cancelText = 'Abbrechen', danger = false } = {}) {
            return new Promise(resolve => {
                _confirmResolve = resolve;
                document.getElementById('confirmModalIcon').textContent = icon;
                document.getElementById('confirmModalIcon').style.color = danger ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-primary)';
                document.getElementById('confirmModalTitle').textContent = title;
                document.getElementById('confirmModalMessage').textContent = message;
                const okBtn = document.getElementById('confirmModalOk');
                okBtn.textContent = okText;
                if (danger) {
                    okBtn.className = 'md-btn';
                    okBtn.style.background = 'var(--md-sys-color-error)';
                    okBtn.style.color = 'var(--md-sys-color-on-error)';
                } else {
                    okBtn.className = 'md-btn md-btn-primary';
                    okBtn.style.background = '';
                    okBtn.style.color = '';
                }
                document.getElementById('confirmModalCancel').textContent = cancelText;
                document.getElementById('confirmModalCancel').style.display = '';
                document.getElementById('confirmModal').classList.add('open');
            });
        }

        function showAlert(message, { title = 'Hinweis', icon = 'info', okText = 'OK' } = {}) {
            return new Promise(resolve => {
                _confirmResolve = resolve;
                document.getElementById('confirmModalIcon').textContent = icon;
                document.getElementById('confirmModalIcon').style.color = 'var(--md-sys-color-primary)';
                document.getElementById('confirmModalTitle').textContent = title;
                document.getElementById('confirmModalMessage').textContent = message;
                document.getElementById('confirmModalOk').textContent = okText;
                document.getElementById('confirmModalOk').className = 'md-btn md-btn-primary';
                document.getElementById('confirmModalOk').style.background = '';
                document.getElementById('confirmModalOk').style.color = '';
                document.getElementById('confirmModalCancel').style.display = 'none';
                document.getElementById('confirmModal').classList.add('open');
            });
        }

        function resolveConfirmModal(result) {
            document.getElementById('confirmModal').classList.remove('open');
            if (_confirmResolve) {
                _confirmResolve(result);
                _confirmResolve = null;
            }
        }

        function openHelpModal() {
            const iframe = document.getElementById('helpIframe');
            iframe.src = 'TimeFlow_Anleitung.html';
            openModal('helpModal');
        }

        // --- PAKET 6.3: Kontexthilfe pro Karte ---
        function openCardHelp(section) {
            const iframe = document.getElementById('helpIframe');
            // Load with hash directly in URL so it scrolls on load
            iframe.src = 'TimeFlow_Anleitung.html#' + section;
            openModal('helpModal');
        }

        function saveSettings() {
            // Flush pendingSettings → state. Kein DOM-Lesen hier.
            state.settings.filePrefix      = pendingSettings.filePrefix || 'TimeFlow_Export';
            state.settings.rounding        = pendingSettings.rounding;
            state.settings.greeting        = pendingSettings.greeting;
            state.settings.progressEnabled = pendingSettings.progressEnabled;
            state.settings.workdayHours    = pendingSettings.workdayHours;
            state.settings.yellowPct       = pendingSettings.yellowPct;
            state.settings.redPct          = pendingSettings.redPct;
            // Externe Links: nur vollständige Einträge (label + url) übernehmen
            state.settings.externalLinks   = (pendingSettings.externalLinks || []).filter(l => l.label && l.url);

            saveData();
            closeModal('settingsModal');
            updateUI();
        }

        // --- SETTINGS TABS ---
        function switchSettingsTab(tabId, btn) {
            document.querySelectorAll('.settings-tab-panel').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            btn.classList.add('active');
            // Trigger preview update when switching to progress tab
            if (tabId === 'tab-progress') updateProgressPreview();
        }

        function updateProgressPreview() {
            // Liest aus pendingSettings — nie aus dem DOM
            const yellowPct = pendingSettings.yellowPct || 60;
            const redPct    = pendingSettings.redPct    || 85;
            const greenW  = Math.max(0, Math.min(yellowPct, 100));
            const yellowW = Math.max(0, Math.min(redPct - yellowPct, 100 - greenW));
            const redW    = Math.max(0, 100 - greenW - yellowW);
            document.getElementById('previewZoneGreen').style.width  = greenW  + '%';
            document.getElementById('previewZoneYellow').style.width = yellowW + '%';
            document.getElementById('previewZoneRed').style.width    = redW    + '%';
            document.getElementById('previewYellowLabel').textContent = yellowPct + '%';
            document.getElementById('previewRedLabel').textContent    = redPct    + '%';
        }

        // --- REMINDERS SETTINGS ---
        function renderReminderListSettings() {
            const container = document.getElementById('reminderListSettings');
            const reminders = state.settings.reminders || [];
            if (reminders.length === 0) {
                container.innerHTML = '<div style="font-size:13px; color:var(--md-sys-color-on-surface-variant); font-style:italic;">Keine Erinnerungen definiert.</div>';
                return;
            }
            container.innerHTML = reminders.map((r, i) => {
                let typeIcon = 'notifications';
                let typeLabel = 'einmalig';
                if (r.intervalMin && r.intervalMin > 0) {
                    typeIcon = 'timer';
                    typeLabel = 'alle ' + r.intervalMin + ' Min.';
                } else if (r.recurring) {
                    typeIcon = 'event_repeat';
                    typeLabel = 'täglich';
                }
                return `
                <div style="display:flex; align-items:center; gap:8px; background:var(--md-sys-color-surface-container-high); padding:8px 12px; border-radius:8px;">
                    <span class="material-symbols-rounded" style="font-size:18px; color:var(--md-sys-color-tertiary);">${typeIcon}</span>
                    <span style="font-family:'Roboto Mono',monospace; font-size:13px; min-width:45px;">${r.time}</span>
                    <span style="flex:1; font-size:13px;">${r.text}</span>
                    <span style="font-size:11px; color:var(--md-sys-color-on-surface-variant); white-space:nowrap;">${typeLabel}</span>
                    <button class="icon-btn" style="width:28px; height:28px; color:var(--md-sys-color-error);" onclick="removeReminder(${i})">
                        <span class="material-symbols-rounded" style="font-size:18px">delete</span>
                    </button>
                </div>`;
            }).join('');
        }

        function addReminderFromSettings() {
            const timeEl = document.getElementById('newReminderTime');
            const textEl = document.getElementById('newReminderText');
            const recurringEl = document.getElementById('newReminderRecurring');
            const intervalEl = document.getElementById('newReminderInterval');
            const time = timeEl.value;
            const text = textEl.value.trim();
            if (!time || !text) return;
            if (!state.settings.reminders) state.settings.reminders = [];
            const reminder = { time, text, recurring: recurringEl.checked };
            const intervalVal = parseInt(intervalEl.value);
            if (intervalVal > 0) {
                reminder.intervalMin = intervalVal;
                reminder.recurring = true; // interval reminders are inherently recurring
            }
            state.settings.reminders.push(reminder);
            state.settings.reminders.sort((a, b) => a.time.localeCompare(b.time));
            saveData();
            timeEl.value = '';
            textEl.value = '';
            recurringEl.checked = false;
            intervalEl.value = '';
            renderReminderListSettings();
        }

        function removeReminder(index) {
            if (!state.settings.reminders) return;
            state.settings.reminders.splice(index, 1);
            saveData();
            renderReminderListSettings();
        }

        function openRemindersSettings() {
            openModal('settingsModal', { tab: 'tab-reminders' });
        }

        // --- CORE LOGIC ---
        function tick() {
            try {
                const now = Date.now();
                const todayStr = new Date().toISOString().split('T')[0];

                // Skip auto-pauses in Home Office mode
                if (!state.settings.homeOffice) {
                    const autoPauses = getAutoPauses();
                    autoPauses.forEach(ap => {
                        if (!ap.start || !ap.end || !ap.label) return;
                        const startDt = new Date(todayStr + 'T' + ap.start);
                        const endDt = new Date(todayStr + 'T' + ap.end);
                        const exists = state.pauses.find(p => p.label === ap.label && isSameDay(new Date(p.startTs), new Date()));

                        if (!exists && now >= startDt.getTime()) {
                            state.pauses.push({
                                id: crypto.randomUUID(),
                                startTs: startDt.getTime(),
                                endTs: endDt.getTime(),
                                type: 'auto',
                                label: ap.label,
                                active: false
                            });
                            saveData();
                            renderPauses();
                        }
                    });
                }

                updateTimeBadges();
                checkPauseStatus();
                checkReminders();
                updateDayProgress();
            } catch (err) {
                console.error('tick error:', err);
            }
        }

        // --- REMINDERS CHECK ---
        function checkReminders() {
            const reminders = state.settings.reminders;
            if (!reminders || reminders.length === 0) return;
            const now = new Date();
            const todayDate = now.toISOString().split('T')[0];
            const currentHHMM = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

            // Reset firedRemindersToday if day changed
            if (firedRemindersToday._date !== todayDate) {
                firedRemindersToday = { _date: todayDate };
            }

            reminders.forEach((r, idx) => {
                const key = r.time + '-' + r.text;
                if (firedRemindersToday[key]) return; // already fired today

                // Interval reminders: check if intervalMin has passed since last fire
                if (r.intervalMin && r.intervalMin > 0) {
                    const intervalKey = 'interval_' + idx;
                    const lastFired = firedRemindersToday[intervalKey] || 0;
                    const nowMs = Date.now();
                    if (lastFired === 0) {
                        // First fire: only after the set time
                        if (currentHHMM >= r.time) {
                            firedRemindersToday[intervalKey] = nowMs;
                            activeReminder = r.text;
                            activeReminderIndex = idx;
                            if (!greetingAnimationRunning) { renderActiveProjectCard(); layoutMasonry(); }
                        }
                    } else if (nowMs - lastFired >= r.intervalMin * 60000) {
                        firedRemindersToday[intervalKey] = nowMs;
                        activeReminder = r.text;
                        activeReminderIndex = idx;
                        if (!greetingAnimationRunning) { renderActiveProjectCard(); layoutMasonry(); }
                    }
                    return;
                }

                if (currentHHMM >= r.time && currentHHMM < incrementTime(r.time, 1)) {
                    firedRemindersToday[key] = true;
                    activeReminder = r.text;
                    activeReminderIndex = idx;
                    if (!greetingAnimationRunning) {
                        renderActiveProjectCard();
                        layoutMasonry();
                    }
                }
            });
        }

        function incrementTime(hhmm, minutes) {
            const [h, m] = hhmm.split(':').map(Number);
            const total = h * 60 + m + minutes;
            return (Math.floor(total / 60) % 24).toString().padStart(2, '0') + ':' + (total % 60).toString().padStart(2, '0');
        }

        // --- DAY PROGRESS UPDATE ---
        function getTotalWorkedTodayMs() {
            const todayStr = new Date().toISOString().split('T')[0];
            let total = 0;
            state.projects.forEach(p => {
                total += calculateNetDurationForDate(p, todayStr);
            });
            return total;
        }

        function renderProgressCard() {
            const container = document.getElementById('dayProgressContainer');
            if (!container) return;
            if (state.settings.progressEnabled === false) {
                container.innerHTML = '';
                container.style.display = 'none';
                return;
            }
            container.style.display = '';
            const workedMs = getTotalWorkedTodayMs();
            const workdayMs = (state.settings.workdayHours || 10) * 3600000;
            const pct = (workedMs / workdayMs) * 100;
            const displayPct = Math.min(pct, 100);
            const yellowPct = state.settings.yellowPct || 60;
            const redPct = state.settings.redPct || 85;
            let barColor = '#66BB6A';
            if (pct > 100) barColor = '#CE93D8';
            else if (pct >= redPct) barColor = '#EF5350';
            else if (pct >= yellowPct) barColor = '#FFCA28';
            const nowTime = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const remainMs = Math.max(0, workdayMs - workedMs);
            const estEndTime = new Date(Date.now() + remainMs).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const workedStr = formatMs(workedMs, false);
            const pctLabel = pct > 100
                ? '<span style="color:#CE93D8; font-weight:600;">' + Math.round(pct) + '%</span> \u00B7 ' + workedStr + ' \u00B7 \u00DCberstunden!'
                : Math.round(pct) + '% \u00B7 ' + workedStr + ' \u00B7 Feierabend ~' + estEndTime;

            container.innerHTML = '<div class="day-progress-wrap" id="dayProgressWrap">'
                + '<div class="day-progress-header">'
                + '<span class="day-progress-clock">\uD83D\uDD50 ' + nowTime + '</span>'
                + '<span class="day-progress-pct">' + pctLabel + '</span>'
                + '</div>'
                + '<div class="day-progress-bar">'
                + '<div class="day-progress-fill" id="dayProgressFill" style="width:' + displayPct + '%; background-color:' + barColor + ';"></div>'
                + '</div>'
                + '</div>';
        }

        function updateDayProgress() {
            if (state.settings.progressEnabled === false) return;
            const fill = document.getElementById('dayProgressFill');
            const wrap = document.getElementById('dayProgressWrap');
            if (!fill || !wrap) return;

            const workedMs = getTotalWorkedTodayMs();
            const workdayMs = (state.settings.workdayHours || 10) * 3600000;
            const pct = (workedMs / workdayMs) * 100; // Allow >100%
            const displayPct = Math.min(pct, 100); // Bar width max 100%
            const yellowPct = state.settings.yellowPct || 60;
            const redPct = state.settings.redPct || 85;

            let barColor = '#66BB6A'; // green
            if (pct > 100) barColor = '#CE93D8'; // purple for >100%
            else if (pct >= redPct) barColor = '#EF5350'; // red
            else if (pct >= yellowPct) barColor = '#FFCA28'; // yellow

            fill.style.width = displayPct + '%';
            fill.style.backgroundColor = barColor;

            // Estimate end time based on worked time and remaining
            const remainMs = Math.max(0, workdayMs - workedMs);
            const estEndTime = new Date(Date.now() + remainMs).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

            // Update clock + percentage text
            const header = wrap.querySelector('.day-progress-header');
            if (header) {
                const nowTime = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                const workedStr = formatMs(workedMs, false);
                const pctLabel = pct > 100
                    ? `<span style="color:#CE93D8; font-weight:600;">${Math.round(pct)}%</span> · ${workedStr} · Überstunden!`
                    : `${Math.round(pct)}% · ${workedStr} · Feierabend ~${estEndTime}`;
                header.innerHTML = `
                    <span class="day-progress-clock">🕐 ${nowTime}</span>
                    <span class="day-progress-pct">${pctLabel}</span>
                `;
            }
        }

        function calculateNetDuration(project) {
            let totalMs = 0;
            const now = Date.now();
            const pauseIntervals = state.pauses.map(p => ({
                start: p.startTs,
                end: p.active ? now : (p.endTs || now)
            }));
            const mergedPauses = mergeIntervals(pauseIntervals);

            project.logs.forEach(log => {
                const logStart = log.start;
                const logEnd = log.end || now;
                if (logEnd <= logStart) return;
                let duration = logEnd - logStart;
                mergedPauses.forEach(pause => {
                    duration -= getOverlap(logStart, logEnd, pause.start, pause.end);
                });
                totalMs += Math.max(0, duration);
            });
            return Math.max(0, totalMs);
        }

        function calculateNetDurationForDate(project, dateStr) {
            const dayStart = new Date(dateStr + 'T00:00:00').getTime();
            const dayEnd = dayStart + 86400000;
            const now = Date.now();

            const pauseIntervals = state.pauses
                .filter(p => {
                    const pEnd = p.active ? now : (p.endTs || now);
                    return pEnd > dayStart && p.startTs < dayEnd;
                })
                .map(p => ({
                    start: Math.max(p.startTs, dayStart),
                    end: Math.min(p.active ? now : (p.endTs || now), dayEnd)
                }));
            const mergedPauses = mergeIntervals(pauseIntervals);

            let totalMs = 0;
            (project.logs || []).forEach(log => {
                const logStart = Math.max(log.start, dayStart);
                const logEnd = Math.min(log.end || now, dayEnd);
                if (logEnd <= logStart) return;
                let duration = logEnd - logStart;
                mergedPauses.forEach(pause => {
                    duration -= getOverlap(logStart, logEnd, pause.start, pause.end);
                });
                totalMs += Math.max(0, duration);
            });
            return Math.max(0, totalMs);
        }

        function calculateNetDurationForRange(project, startDateStr, endDateStr) {
            let total = 0;
            const start = new Date(startDateStr + 'T12:00:00');
            const end = new Date(endDateStr + 'T12:00:00');
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                total += calculateNetDurationForDate(project, d.toISOString().split('T')[0]);
            }
            return total;
        }

        function getRoundedMs(ms, roundingMin) {
            // New Logic: 0 = Exact, >0 = Round up to X minutes
            if (!roundingMin || roundingMin == 0) return ms; 
            const minutes = ms / 60000;
            const roundedMinutes = Math.ceil(minutes / roundingMin) * roundingMin;
            return roundedMinutes * 60000;
        }

        function getOverlap(start1, end1, start2, end2) {
            const start = Math.max(start1, start2);
            const end = Math.min(end1, end2);
            return Math.max(0, end - start);
        }

        function mergeIntervals(intervals) {
            if (intervals.length === 0) return [];
            intervals.sort((a, b) => a.start - b.start);
            const stack = [intervals[0]];
            for (let i = 1; i < intervals.length; i++) {
                const top = stack[stack.length - 1];
                const current = intervals[i];
                if (top.end >= current.start) top.end = Math.max(top.end, current.end);
                else stack.push(current);
            }
            return stack;
        }

        function getDistinctColor() {
            const usedColors = new Set(state.projects.filter(p => p.category !== 'archive').map(p => p.color));
            for (let color of MATERIAL_PALETTE) {
                if (!usedColors.has(color)) return color;
            }
            return MATERIAL_PALETTE[Math.floor(Math.random() * MATERIAL_PALETTE.length)];
        }

        // --- QUICK ACTIONS ---
        function onGoodMorning() {
            // Reset feierabend state if active
            feierabendActive = false;

            const running = state.projects.find(p => p.status === 'running');
            if (running) {
                showAlert("Ein Projekt läuft bereits!", { title: 'Start nicht möglich', icon: 'info' });
                return;
            }
            if (state.manualPauseActive) {
                toggleManualPause(); // End pause if active
            }
            // Start General
            startProject('general');
            saveData();
            updateUI();
        }

        async function onFeierabend() {
            const ok = await showConfirm("Alle Timer werden gestoppt und ein Backup erstellt.", { title: 'Feierabend?', icon: 'bedtime', okText: 'Feierabend!', cancelText: 'Abbrechen' });
            if (ok) {
                // Undo: snapshot before feierabend
                pushUndo({ type: 'feierabend', data: JSON.parse(JSON.stringify(state.projects)), pauses: JSON.parse(JSON.stringify(state.pauses)), timestamp: Date.now(), label: 'Feierabend rückgängig' });

                stopAllProjects();

                // End manual pause if active
                if (state.manualPauseActive) {
                   toggleManualPause();
                }

                // Show Feierabend display
                feierabendActive = true;

                saveDataImmediate();
                updateUI();

                // Download backup
                downloadBackup();

                showUndoToast('Feierabend rückgängig');
            }
        }

        function toggleHomeOffice() {
            state.settings.homeOffice = !state.settings.homeOffice;

            if (state.settings.homeOffice) {
                // When switching TO Home Office: remove today's auto-pauses from state.pauses
                // so they don't linger and appear when switching back later in the day
                const todayStr = new Date().toISOString().split('T')[0];
                state.pauses = state.pauses.filter(p => {
                    if (p.type !== 'auto') return true; // keep manual pauses
                    const pDate = new Date(p.startTs).toISOString().split('T')[0];
                    return pDate !== todayStr; // remove only today's auto-pauses
                });
            }

            saveData();
            updateHomeOfficeBtn();
            updateUI();
        }

        function updateHomeOfficeBtn() {
            const btn = document.getElementById('homeOfficeBtn');
            if (!btn) return;
            const active = state.settings.homeOffice;
            btn.style.background = active ? 'var(--md-sys-color-primary-container)' : '';
            btn.style.borderColor = active ? 'var(--md-sys-color-primary)' : '';
            const icon = btn.querySelector('.material-symbols-rounded');
            if (icon) icon.style.color = active ? 'var(--md-sys-color-primary)' : '#81C784';
            const label = document.getElementById('homeOfficeBtnLabel');
            if (label) label.textContent = active ? 'Home Office ✓' : 'Home Office';
        }

        // --- ACTIONS ---
        function handleNewProject(e) { if (e.key === 'Enter') addProject(); }

        function addProject() {
            const numInput = document.getElementById('newProjectNum');
            const nameInput = document.getElementById('newProjectName');
            const errMsg = document.getElementById('inputErrorMsg');
            
            const num = numInput.value.trim();
            const name = nameInput.value.trim();

            if (!num || !name) {
                errMsg.style.display = 'block';
                return;
            }
            errMsg.style.display = 'none';

            const newProject = {
                id: crypto.randomUUID(),
                number: num,
                name: name,
                category: 'active',
                isFavorite: true,
                color: getDistinctColor(),
                status: 'stopped',
                logs: [],
                tagIds: [],
                parentId: null
            };

            state.projects.unshift(newProject);
            numInput.value = '';
            nameInput.value = '';
            numInput.focus();
            saveData();
            updateUI();
        }

        function switchProject(id) {
            const project = state.projects.find(p => p.id === id);
            if (!project) return;
            if (state.manualPauseActive) toggleManualPause();
            if (project.status === 'running') {
                stopProject(project);
                if (id !== 'general') startProject('general');
            } else {
                stopAllProjects();
                startProject(id);
            }
            saveData();
            updateUI();
        }

        function startProject(idOrObj) {
            const project = typeof idOrObj === 'string' ? state.projects.find(p => p.id === idOrObj) : idOrObj;
            if (project) {
                project.status = 'running';
                project.logs.push({ start: Date.now(), end: null });
            }
        }

        function stopProject(project) {
            if (!project || !project.logs || project.logs.length === 0) return;
            project.status = 'stopped';
            const lastLog = project.logs[project.logs.length - 1];
            if (lastLog && !lastLog.end) lastLog.end = Date.now();
        }

        function stopAllProjects() {
            state.projects.forEach(p => {
                if (p.status === 'running') stopProject(p);
            });
        }

        function toggleFavorite(id, e) {
            e.stopPropagation();
            const p = state.projects.find(x => x.id === id);
            if (p) {
                p.isFavorite = !p.isFavorite;
                // Also update child projects
                getChildProjects(id).forEach(child => {
                    child.isFavorite = p.isFavorite;
                });
                saveData();
                updateUI();
            }
        }

        function setCategory(id, category, e) {
            e.stopPropagation();
            const p = state.projects.find(x => x.id === id);
            if (p) {
                const oldCategory = p.category;
                p.category = category;
                if (category === 'archive') {
                    p.isFavorite = false;
                    p.color = ARCHIVE_COLOR;
                } else if (oldCategory === 'archive' && category === 'active') {
                    p.color = getDistinctColor();
                }
                // Also update child projects
                getChildProjects(id).forEach(child => {
                    child.category = category;
                    if (category === 'archive') {
                        child.isFavorite = false;
                        child.color = ARCHIVE_COLOR;
                    } else if (oldCategory === 'archive' && category === 'active') {
                        child.color = p.color; // Inherit parent's new color
                    }
                });
                saveData();
                updateUI();
            }
        }

        async function deleteProject(id, e) {
            e.stopPropagation();
            const p = state.projects.find(x => x.id === id);
            const children = getChildProjects(id);
            const name = p ? p.name : '';
            const msg = children.length > 0
                ? `„${name}" und ${children.length} Unterprojekt${children.length > 1 ? 'e' : ''} werden unwiderruflich gelöscht.`
                : `„${name}" wird unwiderruflich gelöscht.`;
            const ok = await showConfirm(msg, { title: 'Projekt löschen?', icon: 'delete', okText: 'Löschen', danger: true });
            if (!ok) return;
            // Undo: snapshot before delete
            const deletedProjects = state.projects.filter(x => x.id === id || x.parentId === id);
            pushUndo({ type: 'deleteProject', data: JSON.parse(JSON.stringify(deletedProjects)), timestamp: Date.now(), label: `Projekt "${name}" gelöscht` });
            // Delete project and all its children
            state.projects = state.projects.filter(p => p.id !== id && p.parentId !== id);
            saveData();
            updateUI();
            showUndoToast(`Projekt "${name}" gelöscht`);
        }

        // --- PAUSE ---
        function toggleManualPause() {
            const now = Date.now();
            if (state.manualPauseActive) {
                const pauseEntry = state.pauses.find(p => p.active);
                if (pauseEntry) {
                    pauseEntry.active = false;
                    pauseEntry.endTs = now;
                }
                state.manualPauseActive = false;
            } else {
                state.pauses.unshift({
                    id: crypto.randomUUID(),
                    startTs: now,
                    endTs: null,
                    type: 'manual',
                    label: 'Pause',
                    active: true
                });
                state.manualPauseActive = true;
            }
            saveData();
            updateUI();
        }

        function deletePause(id) {
            const pause = state.pauses.find(p => p.id === id);
            if(!pause) return;
            
            // If deleting an active pause, reset status
            if(pause.active) {
                state.manualPauseActive = false;
            }
            
            state.pauses = state.pauses.filter(p => p.id !== id);
            saveData();
            updateUI();
        }

        function updatePauseTime(id, type, value) {
            const pause = state.pauses.find(p => p.id === id);
            if (!pause) return;
            const todayStr = new Date(pause.startTs).toISOString().split('T')[0];
            const newTs = new Date(todayStr + 'T' + value).getTime();
            if (isNaN(newTs)) return;
            if (type === 'start' && pause.endTs && newTs >= pause.endTs) return;
            if (type === 'end' && newTs <= pause.startTs) return;
            if (type === 'start') pause.startTs = newTs;
            if (type === 'end') pause.endTs = newTs;
            saveData();
            updateUI();
        }

        // Pause status text (runtime only, rendered in Aktivitätsbereich)
        let activePauseText = null;

        function checkPauseStatus() {
            const btn = document.getElementById('manualPauseBtn');
            const now = Date.now();
            const isHO = state.settings.homeOffice;

            // Check if currently in a pause — ignore auto-pauses when Home Office is active
            const inManualPause = state.pauses.some(p => {
                if (p.type === 'auto' && isHO) return false; // skip auto-pauses in HO
                const end = p.active ? now + 1000 : p.endTs;
                return now >= p.startTs && now < end && p.type === 'manual';
            });
            const inAutoPause = !isHO && state.pauses.some(p => {
                if (p.type !== 'auto') return false;
                const end = p.endTs;
                return now >= p.startTs && now < end;
            });

            let newPauseText = null;
            if (state.manualPauseActive) {
                btn.innerHTML = `<span class="material-symbols-rounded">play_arrow</span>`;
                btn.className = "md-btn md-btn-primary";
                newPauseText = "Manuelle Pause";
            } else {
                btn.innerHTML = `<span class="material-symbols-rounded">coffee</span>`;
                btn.className = "md-btn md-btn-tonal";
                if (inAutoPause) {
                    newPauseText = "Automatische Pause";
                } else if (inManualPause) {
                    newPauseText = "Manuelle Pause";
                }
            }

            // Only re-render if pause state changed
            if (newPauseText !== activePauseText) {
                activePauseText = newPauseText;
                if (!greetingAnimationRunning) {
                    renderActiveProjectCard();
                    layoutMasonry();
                }
            }
        }

        // --- GREETING ---

        function showGreeting() {
            const text = (state.settings.greeting || '').trim();
            if (!text) {
                greetingShown = true;
                renderActiveProjectCard();
                return;
            }

            greetingAnimationRunning = true;
            const container = document.getElementById('activeProjectDisplay');

            // Determine time-appropriate icon
            const hour = new Date().getHours();
            let icon = 'wb_sunny'; // default: sun
            if (hour >= 6 && hour < 10) icon = 'wb_sunny';        // Morning sun
            else if (hour >= 10 && hour < 18) icon = 'light_mode'; // Daytime
            else if (hour >= 18 && hour < 21) icon = 'wb_twilight'; // Evening
            else icon = 'clear_night';                              // Night

            container.innerHTML = `
                <div class="greeting-container">
                    <span class="material-symbols-rounded greeting-icon">${icon}</span>
                    <div class="greeting-text">
                        <span id="greetingTyped"></span><span class="greeting-cursor" id="greetingCursor"></span>
                    </div>
                </div>
            `;

            // Typing animation
            const typedEl = document.getElementById('greetingTyped');
            let charIndex = 0;
            const baseSpeed = 45; // ms per character

            function typeNext() {
                if (charIndex < text.length) {
                    // Add character
                    typedEl.textContent += text[charIndex];
                    charIndex++;

                    // Variable speed for natural feel
                    let delay = baseSpeed + Math.random() * 30;
                    // Pause slightly longer after punctuation
                    const lastChar = text[charIndex - 1];
                    if (lastChar === '!' || lastChar === '?' || lastChar === '.') delay += 200;
                    else if (lastChar === ',') delay += 100;

                    setTimeout(typeNext, delay);
                } else {
                    // Typing complete — keep cursor blinking for a moment, then transition
                    setTimeout(() => {
                        const cursor = document.getElementById('greetingCursor');
                        if (cursor) cursor.style.display = 'none';

                        // Fade out greeting
                        const greetContainer = container.querySelector('.greeting-container');
                        if (greetContainer) {
                            greetContainer.classList.add('greeting-fade-out');
                            greetContainer.addEventListener('animationend', () => {
                                greetingShown = true;
                                greetingAnimationRunning = false;
                                renderActiveProjectCard();
                                layoutMasonry();
                            }, { once: true });
                        } else {
                            greetingShown = true;
                            greetingAnimationRunning = false;
                            renderActiveProjectCard();
                            layoutMasonry();
                        }
                    }, 1500);
                }
            }

            // Small initial delay before typing starts
            setTimeout(typeNext, 600);
        }

        // --- RENDERERS ---

        // --- updateUI: Zentraler Render-Entry-Point (Single Source of Truth → DOM) ---
        // Alle Action-Funktionen rufen nur updateUI() auf — nie einzelne Render-Funktionen direkt.
        // Das DOM wird ausschließlich hier und in den Sub-Render-Funktionen beschrieben.
        function updateUI() {
            try {
                // Begrüßungsanimation nicht überschreiben, solange sie läuft
                if (!greetingAnimationRunning) {
                    renderActiveProjectCard();
                }

                let favorites = state.projects.filter(p => p.category === 'active' && p.isFavorite);
                let others = state.projects.filter(p => p.category === 'active' && !p.isFavorite);
                if (uiState.filterTagId) {
                    favorites = favorites.filter(p => (p.tagIds || []).includes(uiState.filterTagId));
                    others = others.filter(p => (p.tagIds || []).includes(uiState.filterTagId));
                }
                renderList('favoriteProjectsList', favorites);
                document.getElementById('noFavsMsg').style.display = favorites.length === 0 ? 'flex' : 'none';
                renderList('otherProjectsList', others);
                document.getElementById('noOthersMsg').style.display = others.length === 0 ? 'flex' : 'none';

                const archiveItems = state.projects.filter(p => p.category === 'archive');
                renderList('archiveProjectsList', archiveItems);
                document.getElementById('noArchiveMsg').style.display = archiveItems.length === 0 ? 'flex' : 'none';

                renderPauses();
                // Auto-Pause-Konfigurationspanel nur neu rendern wenn es offen ist (state-Variable)
                if (autoPausesPanelOpen) renderAutoPausesDisplay();
                renderWeeklyOverview();
                renderExternalLinksCard();
                renderTimesheetCard();
                renderProgressCard();
                renderTagFilter();
                applyCardVisibility();
                applyCardOrder();       // Reihenfolge + grid-wide aus state.settings.cardLayout
                renderCardVisibilityMenu();
                updateTimeBadges();
                layoutMasonry();
                applyAriaLabels();
            } catch (err) {
                console.error('updateUI error:', err);
            }
        }

        // Helper function for color conversion
        function hexToRgba(hex, alpha) {
            hex = hex.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        // --- PAKET 5.1: Dynamische Kontrastberechnung (WCAG) ---
        function getContrastTextColor(hexColor) {
            if (!hexColor || hexColor.startsWith('var(')) return '#FFFBFE';
            const hex = hexColor.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16) / 255;
            const g = parseInt(hex.substring(2, 4), 16) / 255;
            const b = parseInt(hex.substring(4, 6), 16) / 255;
            const toLinear = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
            return luminance > 0.5 ? '#1C1B1F' : '#FFFBFE';
        }

        function renderActiveProjectCard() {
            const container = document.getElementById('activeProjectDisplay');

            // Feierabend state
            if (feierabendActive) {
                container.innerHTML = `
                    <div class="feierabend-display">
                        <div class="feierabend-icon">🎉</div>
                        <div class="feierabend-text">Feierabend!</div>
                        <div style="font-size:14px; color:var(--md-sys-color-on-surface-variant); margin-top:8px;">Schönen Abend! Bis morgen.</div>
                    </div>
                `;
                return;
            }

            const runningProject = state.projects.find(p => p.status === 'running');
            const displayProject = runningProject || state.projects.find(p => p.id === 'general');

            if (!displayProject) {
                 container.innerHTML = '<div style="opacity:0.5; text-align:center;">Kein aktives Projekt</div>';
                 return;
            }

            const bgColor = displayProject.color || 'var(--md-sys-color-primary-container)';
            const textColor = getContrastTextColor(bgColor);
            const isLightText = textColor === '#FFFBFE';
            const numberBgOpacity = isLightText ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.1)';
            const stopBtnBg = isLightText ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.12)';

            const totalAllTime = calculateNetDuration(displayProject);

            const isBanner = document.getElementById('card-active').classList.contains('grid-wide');

            // Build pause banner HTML – im Banner-Modus als Chip in der linken Sektion
            const pauseChipHtml = (isBanner && activePauseText)
                ? `<div class="banner-pause-chip">
                       <span class="material-symbols-rounded" style="font-size:14px;">pause_circle</span>
                       ${activePauseText}
                   </div>`
                : '';
            const pauseHtml = (!isBanner && activePauseText)
                ? `<div class="pause-banner visible">
                       <span class="material-symbols-rounded">pause_circle</span>
                       <span style="font-weight:500;">${activePauseText}</span>
                   </div>`
                : '';

            // Build reminder HTML – im Banner-Modus horizontal, sonst als Overlay
            let reminderHtml = '';
            if (activeReminder) {
                reminderHtml = isBanner
                    ? `<div class="reminder-banner reminder-banner-wide" onclick="dismissReminder()">
                           <span class="material-symbols-rounded reminder-banner-icon">notifications_active</span>
                           <span class="reminder-banner-text">${activeReminder}</span>
                           <span class="reminder-banner-close">
                               <span class="material-symbols-rounded" style="font-size:16px;">close</span>
                               Schließen
                           </span>
                       </div>`
                    : `<div class="reminder-banner" onclick="dismissReminder()">
                           <span class="material-symbols-rounded reminder-banner-icon">notifications_active</span>
                           <span class="reminder-banner-text">${activeReminder}</span>
                           <span class="reminder-banner-close">
                               <span class="material-symbols-rounded" style="font-size:16px;">close</span>
                               Schließen
                           </span>
                       </div>`;
            }
            const parentName = displayProject.parentId
                ? (state.projects.find(pp => pp.id === displayProject.parentId) || {}).name || ''
                : '';
            const parentHtml = displayProject.parentId
                ? `<div style="font-size:12px; opacity:0.6; color:inherit;">
                       <span class="material-symbols-rounded" style="font-size:14px; vertical-align:middle;">account_tree</span>
                       ${parentName}
                   </div>`
                : '';
            const pauseBtn = state.manualPauseActive
                ? `<button class="md-btn" onclick="toggleManualPause()" style="background:${stopBtnBg}; color:inherit;">
                       <span class="material-symbols-rounded">play_arrow</span> Weiter
                   </button>`
                : `<button class="md-btn" onclick="toggleManualPause()" style="background:${stopBtnBg}; color:inherit;">
                       <span class="material-symbols-rounded">coffee</span> Pause
                   </button>`;
            const stopBtn = displayProject.id !== 'general'
                ? `<button class="md-btn" onclick="stopProjectById('${displayProject.id}')" style="background:${stopBtnBg}; color:inherit;">
                       <span class="material-symbols-rounded">stop</span> Stoppen
                   </button>`
                : '';
            const totalHtml = `<div style="display:flex; align-items:center; gap:6px; opacity:0.75;">
                <span class="material-symbols-rounded" style="font-size:16px; color:inherit;">history</span>
                <span class="active-project-total" data-pid="${displayProject.id}" style="font-size:14px; font-family:'Roboto Mono', monospace; color:inherit;">${formatMs(totalAllTime, false)}</span>
                <span style="font-size:11px; color:inherit;">Gesamt</span>
            </div>`;

            const cardInner = isBanner
                ? `<div class="active-project-card active-banner-mode" style="background-color:${bgColor}; color:${textColor};">
                       <div class="banner-section-left">
                           <div class="active-project-number" style="background:${numberBgOpacity}">#${displayProject.number || '-'}</div>
                           ${parentHtml}
                           <div class="active-project-name">${displayProject.name}</div>
                           ${pauseChipHtml}
                       </div>
                       <div class="banner-section-center">
                           <div class="active-project-time" data-pid="${displayProject.id}">00:00:00</div>
                           <div style="font-size:12px; opacity:0.65; color:inherit; margin-top:2px;">Heute</div>
                       </div>
                       <div class="banner-section-right">
                           ${totalHtml}
                           <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
                               ${pauseBtn}${stopBtn}
                           </div>
                       </div>
                   </div>`
                : `<div class="active-project-card" style="background-color:${bgColor}; color:${textColor};">
                       <div class="active-project-number" style="background:${numberBgOpacity}">#${displayProject.number || '-'}</div>
                       ${parentHtml}
                       <div class="active-project-name">${displayProject.name}</div>
                       <div class="active-project-time" data-pid="${displayProject.id}">00:00:00</div>
                       <div style="font-size:12px; opacity:0.7; color:inherit;">Heute</div>
                       ${totalHtml}
                       <div style="display:flex; gap:8px; margin-top:4px; flex-wrap:wrap;">
                           ${pauseBtn}${stopBtn}
                       </div>
                   </div>`;

            container.innerHTML = `${pauseHtml}${reminderHtml}${cardInner}`;
        }

        function dismissReminder() {
            // Delete one-time (non-recurring, non-interval) reminders on dismiss
            if (activeReminderIndex >= 0 && state.settings.reminders) {
                const r = state.settings.reminders[activeReminderIndex];
                if (r && !r.recurring && !r.intervalMin) {
                    state.settings.reminders.splice(activeReminderIndex, 1);
                    saveData();
                }
            }
            activeReminder = null;
            activeReminderIndex = -1;
            updateUI();
        }

        function stopProjectById(id) {
            const p = state.projects.find(x => x.id === id);
            if(p) {
                stopProject(p);
                startProject('general');
                saveData();
                updateUI();
            }
        }

        function renderList(elementId, items) {
            const el = document.getElementById(elementId);
            el.innerHTML = '';

            const isFavList = elementId === 'favoriteProjectsList';

            // Build ordered list: parent projects first, followed by their children
            const orderedItems = [];
            const parentItems = items.filter(p => !p.parentId);
            parentItems.forEach(p => {
                orderedItems.push(p);
                // Add children of this parent that are also in items
                const children = items.filter(c => c.parentId === p.id);
                children.forEach(c => orderedItems.push(c));
            });
            // Also add any orphaned sub-projects (parent not in this list)
            items.filter(p => p.parentId && !parentItems.find(pp => pp.id === p.parentId)).forEach(p => orderedItems.push(p));

            orderedItems.forEach(p => {
                const isRunning = p.status === 'running';
                const isFav = p.isFavorite;
                const pColor = p.color || ARCHIVE_COLOR;
                const pNum = p.number ? `#${p.number}` : '';
                const isSub = !!p.parentId;
                const hasChildren = isParentProject(p.id);
                const isCollapsed = uiState.collapsedParents.has(p.parentId);

                // Skip rendering if parent is collapsed (but not if running)
                if (isSub && isCollapsed && !isRunning) return;

                const li = document.createElement('li');
                li.className = `list-item ${isRunning ? 'running' : ''} ${isSub ? 'sub-project-item' : ''}`;
                li.onclick = () => switchProject(p.id);
                // Paket 11: Keyboard accessibility
                li.setAttribute('tabindex', '0');
                li.setAttribute('role', 'button');
                li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); switchProject(p.id); } });

                // --- SPECIAL STYLING FOR FAVORITES ---
                let dotHtml = `<div class="color-dot" style="background-color: ${pColor}"></div>`;

                if (isFavList) {
                    const opacity = isRunning ? 0.25 : 0.10;
                    const bg = hexToRgba(pColor, opacity);
                    li.style.cssText = `border: 1px solid ${pColor}; background-color: ${bg}; margin-bottom:4px;`;
                    dotHtml = '';
                }

                // Sub-project indent styling
                if (isSub) {
                    li.style.marginLeft = '24px';
                    li.style.borderLeft = `3px solid ${pColor}40`;
                    li.style.paddingLeft = '8px';
                    li.style.fontSize = '13px';
                }

                // --- VISIBLE ACTIONS (always shown) ---
                let actionsHtml = '';

                if (p.category === 'active' && !isSub) {
                    const iconClass = isFav ? 'fav-icon' : '';
                    const iconStyle = isFav ? '' : 'opacity:0.3';
                    actionsHtml += `
                        <button class="icon-btn" onclick="toggleFavorite('${p.id}', event)" data-tooltip="${isFav ? 'Favorit entfernen' : 'Als Favorit'}">
                            <span class="material-symbols-rounded ${iconClass}" style="${iconStyle}">star</span>
                        </button>`;
                }

                // --- OVERFLOW MENU (⋮) ---
                let menuItems = '';
                menuItems += `<div class="proj-menu-item" onclick="openTimeEdit('${p.id}', event)">
                    <span class="material-symbols-rounded">schedule</span> Zeiten bearbeiten
                </div>`;
                menuItems += `<div class="proj-menu-item" onclick="openProjectEdit('${p.id}', event)">
                    <span class="material-symbols-rounded">edit</span> Projekt bearbeiten
                </div>`;
                if (state.tags.length > 0) {
                    menuItems += `<div class="proj-menu-item" onclick="openTagAssign('${p.id}', event)">
                        <span class="material-symbols-rounded">label</span> Tags zuordnen
                    </div>`;
                }
                if (!isSub && p.id !== 'general' && p.category === 'active') {
                    menuItems += `<div class="proj-menu-item" onclick="openSubProjectModal('${p.id}', event)">
                        <span class="material-symbols-rounded">account_tree</span> Unterprojekt anlegen
                    </div>`;
                }
                if (p.id !== 'general') {
                    const archiveLabel = p.category === 'archive' ? 'Wiederherstellen' : 'Archivieren';
                    const archiveIcon = p.category === 'archive' ? 'unarchive' : 'archive';
                    const targetCat = p.category === 'archive' ? 'active' : 'archive';
                    menuItems += `<div class="proj-menu-divider"></div>`;
                    menuItems += `<div class="proj-menu-item" onclick="setCategory('${p.id}', '${targetCat}', event)">
                        <span class="material-symbols-rounded">${archiveIcon}</span> ${archiveLabel}
                    </div>`;
                    menuItems += `<div class="proj-menu-item proj-menu-item-danger" onclick="deleteProject('${p.id}', event)">
                        <span class="material-symbols-rounded">delete</span> Löschen
                    </div>`;
                }

                actionsHtml += `
                    <div class="proj-menu-wrap">
                        <button class="icon-btn proj-menu-trigger" onclick="toggleProjectMenu(this, event)" data-tooltip="Aktionen" data-project-id="${p.id}">
                            <span class="material-symbols-rounded" style="font-size:20px">more_vert</span>
                        </button>
                        <div class="proj-menu">${menuItems}</div>
                    </div>`;

                // Tag chips
                const tagChips = (p.tagIds || []).map(tid => {
                    const tag = state.tags.find(t => t.id === tid);
                    if (!tag) return '';
                    return '<span style="font-size:10px; padding:1px 6px; border-radius:4px; background:' + tag.color + '20; color:' + tag.color + '; margin-left:4px; white-space:nowrap;">' + tag.name + '</span>';
                }).join('');

                // Sub-project icon prefix
                const subIcon = isSub ? '<span class="material-symbols-rounded" style="font-size:14px; opacity:0.4; margin-right:2px;">subdirectory_arrow_right</span>' : '';
                // Inline collapse toggle for parent projects
                const collapseToggle = hasChildren ?
                    '<span class="inline-collapse-btn" onclick="toggleCollapseChildren(\'' + p.id + '\', event)" data-tooltip="' + (uiState.collapsedParents.has(p.id) ? 'Unterprojekte einblenden' : 'Unterprojekte ausblenden') + '">'
                    + '<span class="material-symbols-rounded" style="font-size:16px;">' + (uiState.collapsedParents.has(p.id) ? 'expand_more' : 'expand_less') + '</span></span>'
                    : '';
                // Parent project: show child count if has children
                const collapseIcon = hasChildren && uiState.collapsedParents.has(p.id) ? '<span class="material-symbols-rounded" style="font-size:12px; opacity:0.4; margin-left:2px;">more_horiz</span>' : '';
                const childBadge = hasChildren ? `<span style="font-size:10px; padding:1px 6px; border-radius:4px; background:rgba(168,199,250,0.15); color:var(--md-sys-color-primary); margin-left:4px;">${getChildProjects(p.id).length} UP${collapseIcon}</span>` : '';

                // Paket 12.2: Info icon for "Allgemein" project
                const generalInfoIcon = p.id === 'general' ? '<span class="material-symbols-rounded" style="font-size:12px; opacity:0.35; margin-left:4px; vertical-align:middle;" data-tooltip="Erfasst die Zeit wenn kein anderes Projekt aktiv ist">info</span>' : '';

                li.innerHTML = `
                    ${dotHtml}
                    <div class="item-content">
                        <div class="item-number">${pNum}${tagChips}${childBadge}</div>
                        <div class="item-text">${collapseToggle}${subIcon}${p.name}${generalInfoIcon}</div>
                    </div>
                    <div class="item-times">
                        <span class="time-chip" data-pid="${p.id}" ${isFavList ? `style="border:1px solid ${pColor}30; color:${pColor};"` : ''}>
                            <span class="time-chip-label">Heute</span>00:00
                        </span>
                        <span class="time-chip-total" data-pid="${p.id}" style="font-size:11px; color:var(--md-sys-color-on-surface-variant); font-family:'Roboto Mono',monospace; opacity:0.6;">00:00</span>
                    </div>
                    <div class="item-actions">${actionsHtml}</div>
                `;
                el.appendChild(li);
            });
        }

        function toggleCollapseChildren(parentId, e) {
            if (e) { e.stopPropagation(); e.preventDefault(); }
            if (uiState.collapsedParents.has(parentId)) {
                uiState.collapsedParents.delete(parentId);
            } else {
                uiState.collapsedParents.add(parentId);
            }
            updateUI();
        }

        // --- PROJECT OVERFLOW MENU ---
        function toggleProjectMenu(btn, e) {
            e.stopPropagation();
            e.preventDefault();
            const projectId = btn.dataset.projectId;
            const wrap = btn.closest('.proj-menu-wrap');
            const menu = wrap.querySelector('.proj-menu');
            // Determine if THIS menu was already open (via uiState — kein classList.contains())
            const wasOpen = uiState.openMenuProjectId === projectId;
            // Close all open menus first (updates uiState + DOM)
            closeAllProjectMenus();
            if (!wasOpen) {
                // Open this menu
                uiState.openMenuProjectId = projectId;
                menu.classList.add('open');
                // Position: ensure menu doesn't overflow viewport
                requestAnimationFrame(() => {
                    const rect = menu.getBoundingClientRect();
                    if (rect.bottom > window.innerHeight) {
                        menu.style.top = 'auto';
                        menu.style.bottom = '100%';
                    }
                    if (rect.left < 0) {
                        menu.style.right = 'auto';
                        menu.style.left = '0';
                    }
                });
            }
        }

        function closeAllProjectMenus() {
            uiState.openMenuProjectId = null;
            document.querySelectorAll('.proj-menu.open').forEach(m => {
                m.classList.remove('open');
                m.style.top = '';
                m.style.bottom = '';
                m.style.left = '';
                m.style.right = '';
            });
        }

        // Close project menus when clicking anywhere else
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.proj-menu-wrap')) {
                closeAllProjectMenus();
            }
        });

        function renderPauses() {
            const el = document.getElementById('pauseList');
            el.innerHTML = '';
            const isHO = state.settings.homeOffice;
            const relevantPauses = state.pauses.filter(p => {
                const pDate = new Date(p.startTs).toISOString().split('T')[0];
                if (pDate !== uiState.viewDate) return false;
                // Only show manual pauses here — auto-pauses are managed via the config panel above
                if (p.type === 'auto') return false;
                return true;
            });
            relevantPauses.sort((a,b) => b.startTs - a.startTs);

            relevantPauses.forEach(p => {
                const startStr = formatTimeInput(p.startTs);
                const endStr = p.endTs ? formatTimeInput(p.endTs) : '';
                
                const div = document.createElement('div');
                div.style.display = 'flex';
                div.style.alignItems = 'center';
                div.style.justifyContent = 'space-between';
                div.style.background = 'var(--md-sys-color-surface-container-high)';
                div.style.padding = '8px 12px';
                div.style.borderRadius = '8px';
                div.style.marginBottom = '8px';
                
                div.innerHTML = `
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="material-symbols-rounded" style="font-size:18px; color:var(--md-sys-color-secondary)">
                            ${p.type === 'auto' ? 'smart_toy' : 'coffee'}
                        </span>
                        <span style="font-size:14px">${p.label}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:4px;">
                        <input type="text" value="${startStr}" onchange="updatePauseTime('${p.id}', 'start', this.value)"
                            style="background:transparent; border:none; width:44px; text-align:center; color:var(--md-sys-color-on-surface); font-family:monospace;">
                        <span style="opacity:0.5">-</span>
                        <input type="text" value="${endStr}" ${p.active ? 'disabled' : ''} onchange="updatePauseTime('${p.id}', 'end', this.value)"
                            style="background:transparent; border:none; width:44px; text-align:center; color:var(--md-sys-color-on-surface); font-family:monospace;">
                            
                        <button class="icon-btn" style="width:24px; height:24px; margin-left:8px; color:var(--md-sys-color-error);" 
                            onclick="deletePause('${p.id}')" title="Pause löschen">
                            <span class="material-symbols-rounded" style="font-size:18px">delete</span>
                        </button>
                    </div>
                `;
                el.appendChild(div);
            });
        }

        // Aggregated time: project + all child projects
        function calculateNetDurationWithChildren(project) {
            let total = calculateNetDuration(project);
            getChildProjects(project.id).forEach(child => {
                total += calculateNetDuration(child);
            });
            return total;
        }

        function calculateNetDurationForDateWithChildren(project, dateStr) {
            let total = calculateNetDurationForDate(project, dateStr);
            getChildProjects(project.id).forEach(child => {
                total += calculateNetDurationForDate(child, dateStr);
            });
            return total;
        }

        function updateTimeBadges() {
            const todayStr = new Date().toISOString().split('T')[0];
            const displayProject = state.projects.find(p => p.status === 'running') || state.projects.find(p => p.id === 'general');

            if (displayProject) {
                const todayMs = calculateNetDurationForDate(displayProject, todayStr);
                const activeBadge = document.querySelector('.active-project-time');
                if (activeBadge && activeBadge.dataset.pid === displayProject.id) {
                    activeBadge.innerText = formatMs(todayMs, true); // with seconds in active card
                }
                const totalBadge = document.querySelector('.active-project-total');
                if (totalBadge && totalBadge.dataset.pid === displayProject.id) {
                    totalBadge.innerText = formatMs(calculateNetDuration(displayProject), false);
                }
                // Dynamic browser tab title
                const isRunning = displayProject.status === 'running';
                const icon = isRunning ? '\u25B6' : '\u23F8';
                document.title = `${icon} ${displayProject.name} \u2014 ${formatMs(todayMs, false)} | TimeFlow`;
            } else {
                document.title = 'TimeFlow';
            }

            // List time chips: day time (top) + total time (bottom)
            // Parent projects show aggregated time (own + children)
            document.querySelectorAll('.time-chip').forEach(badge => {
                const pid = badge.dataset.pid;
                const project = state.projects.find(p => p.id === pid);
                if (project) {
                    const hasKids = isParentProject(pid);
                    const dayMs = hasKids
                        ? calculateNetDurationForDateWithChildren(project, todayStr)
                        : calculateNetDurationForDate(project, todayStr);
                    const label = badge.querySelector('.time-chip-label');
                    if (label) {
                        // Preserve the mini-label, update only the text after it
                        badge.innerHTML = '<span class="time-chip-label">Heute</span>' + formatMs(dayMs, false);
                    } else {
                        badge.innerText = formatMs(dayMs, false);
                    }
                }
            });
            document.querySelectorAll('.time-chip-total').forEach(badge => {
                const pid = badge.dataset.pid;
                const project = state.projects.find(p => p.id === pid);
                if (project) {
                    const hasKids = isParentProject(pid);
                    const totalMs = hasKids
                        ? calculateNetDurationWithChildren(project)
                        : calculateNetDuration(project);
                    badge.innerText = totalMs > 0 ? '\u03A3 ' + formatMs(totalMs, false) : '';
                }
            });
        }

        // --- PROJECT EDIT ---
        function openProjectEdit(projectId, e) {
            if (e) e.stopPropagation();
            const p = state.projects.find(x => x.id === projectId);
            if (!p) return;
            editingProjectId = projectId;
            document.getElementById('editProjectNum').value = p.number || '';
            document.getElementById('editProjectName').value = p.name || '';
            openModal('projectEditModal');
        }

        function saveProjectEdit() {
            if (!editingProjectId) return;
            const p = state.projects.find(x => x.id === editingProjectId);
            if (!p) return;
            const num = document.getElementById('editProjectNum').value.trim();
            const name = document.getElementById('editProjectName').value.trim();
            if (!name) return;
            p.number = num || p.number;
            p.name = name;
            saveData();
            closeModal('projectEditModal');
            updateUI();
        }

        // --- SUB-PROJECTS ---
        function openSubProjectModal(parentId, e) {
            if (e) e.stopPropagation();
            const parent = state.projects.find(x => x.id === parentId);
            if (!parent) return;
            editingProjectId = parentId; // Store parent ID
            document.getElementById('subProjectParentTitle').innerText = `Übergeordnet: ${parent.number || ''} ${parent.name}`;
            document.getElementById('subProjectName').value = '';
            openModal('subProjectModal');
            setTimeout(() => document.getElementById('subProjectName').focus(), 100);
        }

        function saveSubProject() {
            if (!editingProjectId) return;
            const parent = state.projects.find(x => x.id === editingProjectId);
            if (!parent) return;
            const name = document.getElementById('subProjectName').value.trim();
            if (!name) return;

            const subProject = {
                id: crypto.randomUUID(),
                number: parent.number || '-',
                name: name,
                category: parent.category,
                isFavorite: parent.isFavorite,
                color: parent.color,
                status: 'stopped',
                logs: [],
                tagIds: [],
                parentId: parent.id,
                dailyNotes: {}
            };

            // Insert sub-project right after parent (and any existing sub-projects of this parent)
            const parentIdx = state.projects.indexOf(parent);
            let insertIdx = parentIdx + 1;
            while (insertIdx < state.projects.length && state.projects[insertIdx].parentId === parent.id) {
                insertIdx++;
            }
            state.projects.splice(insertIdx, 0, subProject);

            saveData();
            closeModal('subProjectModal');
            updateUI();
        }

        function getChildProjects(parentId) {
            return state.projects.filter(p => p.parentId === parentId);
        }

        function isParentProject(projectId) {
            return state.projects.some(p => p.parentId === projectId);
        }

        // --- TIME EDIT ---
        function openTimeEdit(projectId, e) {
            if (e) e.stopPropagation();
            const p = state.projects.find(x => x.id === projectId);
            if (!p) return;
            editingProjectId = projectId;
            document.getElementById('timeEditProjectTitle').innerText = (p.number || '') + ' ' + p.name;
            renderTimeEditLogs(p);
            openModal('timeEditModal');
        }

        function renderTimeEditLogs(project) {
            const container = document.getElementById('timeEditLogList');
            const viewDate = uiState.viewDate;
            const dayStart = new Date(viewDate + 'T00:00:00').getTime();
            const dayEnd = dayStart + 86400000;

            // Filter logs that overlap with viewDate
            const relevantLogs = [];
            (project.logs || []).forEach((log, idx) => {
                const logEnd = log.end || Date.now();
                if (logEnd > dayStart && log.start < dayEnd) {
                    relevantLogs.push({ ...log, originalIndex: idx });
                }
            });

            if (relevantLogs.length === 0) {
                container.innerHTML = '<div style="padding:16px; text-align:center; color:var(--md-sys-color-on-surface-variant); font-size:13px; font-style:italic;">Keine Eintr\u00e4ge f\u00fcr diesen Tag.</div>';
                return;
            }

            container.innerHTML = relevantLogs.map((log, i) => {
                const startDate = new Date(log.start);
                const endDate = log.end ? new Date(log.end) : null;
                const startTime = startDate.getHours().toString().padStart(2, '0') + ':' + startDate.getMinutes().toString().padStart(2, '0');
                const endTime = endDate ? endDate.getHours().toString().padStart(2, '0') + ':' + endDate.getMinutes().toString().padStart(2, '0') : 'l\u00e4uft...';
                const durationMs = (log.end || Date.now()) - log.start;
                const isActive = !log.end;

                return '<div style="display:flex; align-items:center; gap:8px; padding:10px 12px; background:var(--md-sys-color-surface-container-high); border-radius:8px;' + (isActive ? ' border:1px solid var(--md-sys-color-primary);' : '') + '">' +
                    '<span class="material-symbols-rounded" style="font-size:18px; color:var(--md-sys-color-on-surface-variant);">schedule</span>' +
                    '<input type="text" value="' + startTime + '" ' +
                        'onchange="updateLogTime(\'' + project.id + '\', ' + log.originalIndex + ', \'start\', this.value)" ' +
                        'style="background:transparent; border:none; width:50px; text-align:center; color:var(--md-sys-color-on-surface); font-family:monospace; font-size:14px;">' +
                    '<span style="opacity:0.5;">\u2192</span>' +
                    (isActive ?
                        '<span style="color:var(--md-sys-color-primary); font-family:monospace; font-size:14px;">l\u00e4uft...</span>' :
                        '<input type="text" value="' + endTime + '" ' +
                            'onchange="updateLogTime(\'' + project.id + '\', ' + log.originalIndex + ', \'end\', this.value)" ' +
                            'style="background:transparent; border:none; width:50px; text-align:center; color:var(--md-sys-color-on-surface); font-family:monospace; font-size:14px;">') +
                    '<span style="flex:1; text-align:right; font-family:monospace; font-size:12px; color:var(--md-sys-color-on-surface-variant);">' + formatMs(durationMs, false) + '</span>' +
                    (!isActive ? '<button class="icon-btn" style="width:24px; height:24px; color:var(--md-sys-color-error);" onclick="deleteLog(\'' + project.id + '\', ' + log.originalIndex + ')" title="Eintrag l\u00f6schen"><span class="material-symbols-rounded" style="font-size:18px">delete</span></button>' : '') +
                '</div>';
            }).join('');
        }

        function updateLogTime(projectId, logIndex, type, value) {
            const p = state.projects.find(x => x.id === projectId);
            if (!p || !p.logs[logIndex]) return;
            const log = p.logs[logIndex];
            const refDate = new Date(log.start);
            const dateStr = refDate.getFullYear() + '-' + String(refDate.getMonth() + 1).padStart(2, '0') + '-' + String(refDate.getDate()).padStart(2, '0');
            const newTs = new Date(dateStr + 'T' + value + ':00').getTime();
            if (isNaN(newTs)) return;

            // 9.3: Enhanced validation
            if (type === 'start' && log.end && newTs >= log.end) {
                showAlert('Startzeit muss vor der Endzeit liegen.', { title: 'Ungültige Zeit', icon: 'error' });
                renderTimeEditLogs(p);
                return;
            }
            if (type === 'end' && newTs <= log.start) {
                showAlert('Endzeit muss nach der Startzeit liegen.', { title: 'Ungültige Zeit', icon: 'error' });
                renderTimeEditLogs(p);
                return;
            }

            if (type === 'start') {
                const oldStart = log.start;
                log.start = newTs;
                // Adjust adjacent end times across ALL projects
                adjustAdjacentLogs(oldStart, newTs, 'end');
            } else {
                const oldEnd = log.end;
                log.end = newTs;
                // Adjust adjacent start times across ALL projects
                adjustAdjacentLogs(oldEnd, newTs, 'start');
            }
            saveData();
            renderTimeEditLogs(p);
            updateUI();
        }

        // When a log boundary changes, find logs in other projects that had the same boundary and adjust
        function adjustAdjacentLogs(oldTs, newTs, fieldToAdjust) {
            if (!oldTs || oldTs === newTs) return;
            const tolerance = 60000; // 1 minute tolerance for matching
            state.projects.forEach(proj => {
                (proj.logs || []).forEach(log => {
                    if (fieldToAdjust === 'start') {
                        // If another log started at the old end-time, move its start
                        if (log.start && Math.abs(log.start - oldTs) <= tolerance) {
                            if (!log.end || newTs < log.end) {
                                log.start = newTs;
                            }
                        }
                    } else if (fieldToAdjust === 'end') {
                        // If another log ended at the old start-time, move its end
                        if (log.end && Math.abs(log.end - oldTs) <= tolerance) {
                            if (newTs > log.start) {
                                log.end = newTs;
                            }
                        }
                    }
                });
            });
        }

        function deleteLog(projectId, logIndex) {
            const p = state.projects.find(x => x.id === projectId);
            if (!p || !p.logs[logIndex]) return;
            if (p.logs[logIndex].end === null) return; // Can't delete active log
            p.logs.splice(logIndex, 1);
            saveData();
            renderTimeEditLogs(p);
            updateUI();
        }

        // --- TAGS ---
        function addTag() {
            const name = document.getElementById('newTagName').value.trim();
            const color = document.getElementById('newTagColor').value;
            if (!name) return;
            state.tags.push({ id: crypto.randomUUID(), name, color });
            document.getElementById('newTagName').value = '';
            saveData();
            renderTagList();
            updateUI();
        }

        function deleteTag(tagId) {
            state.tags = state.tags.filter(t => t.id !== tagId);
            state.projects.forEach(p => {
                p.tagIds = (p.tagIds || []).filter(id => id !== tagId);
            });
            if (uiState.filterTagId === tagId) uiState.filterTagId = null;
            saveData();
            renderTagList();
            updateUI();
        }

        function renderTagList() {
            const container = document.getElementById('tagListContainer');
            if (!container) return;
            if (state.tags.length === 0) {
                container.innerHTML = '<div style="padding:16px; text-align:center; color:var(--md-sys-color-on-surface-variant); font-size:13px; font-style:italic;">Noch keine Tags erstellt.</div>';
                return;
            }
            container.innerHTML = state.tags.map(t => `
                <div style="display:flex; align-items:center; gap:8px; padding:8px; background:var(--md-sys-color-surface-container-high); border-radius:8px;">
                    <span style="width:16px; height:16px; border-radius:4px; background:${t.color}; flex-shrink:0;"></span>
                    <span style="flex:1; font-size:14px;">${t.name}</span>
                    <button class="icon-btn" style="width:28px; height:28px; color:var(--md-sys-color-error);" onclick="deleteTag('${t.id}')">
                        <span class="material-symbols-rounded" style="font-size:18px">delete</span>
                    </button>
                </div>
            `).join('');
        }

        function renderTagFilter() {
            const container = document.getElementById('tagFilterBar');
            if (!container) return;
            if (state.tags.length === 0) { container.innerHTML = ''; return; }
            let html = '<span class="material-symbols-rounded" style="font-size:18px; color:var(--md-sys-color-on-surface-variant);">filter_alt</span>';
            html += state.tags.map(t => {
                const active = uiState.filterTagId === t.id;
                return '<button onclick="setTagFilter(\'' + t.id + '\')" style="font-size:12px; padding:4px 10px; border-radius:16px; border:1px solid ' + t.color + '; background:' + (active ? t.color + '30' : 'transparent') + '; color:' + t.color + '; cursor:pointer; font-family:var(--font-stack); font-weight:' + (active ? '700' : '400') + ';">' + t.name + '</button>';
            }).join(' ');
            container.innerHTML = html;
        }

        function setTagFilter(tagId) {
            uiState.filterTagId = uiState.filterTagId === tagId ? null : tagId;
            updateUI();
        }

        function openTagAssign(projectId, e) {
            if (e) e.stopPropagation();
            const p = state.projects.find(x => x.id === projectId);
            if (!p) return;
            editingProjectId = projectId;
            document.getElementById('tagAssignProjectTitle').innerText = (p.number || '') + ' ' + p.name;

            const container = document.getElementById('tagAssignList');
            if (state.tags.length === 0) {
                container.innerHTML = '<div style="padding:16px; text-align:center; color:var(--md-sys-color-on-surface-variant); font-size:13px;">Erstelle zuerst Tags über das Label-Icon im Header.</div>';
            } else {
                container.innerHTML = state.tags.map(t => {
                    const checked = (p.tagIds || []).includes(t.id);
                    return '<label style="display:flex; align-items:center; gap:12px; padding:10px; background:var(--md-sys-color-surface-container-high); border-radius:8px; cursor:pointer;">' +
                        '<input type="checkbox" ' + (checked ? 'checked' : '') + ' onchange="toggleProjectTag(\'' + projectId + '\', \'' + t.id + '\')" style="width:18px; height:18px; accent-color:' + t.color + ';">' +
                        '<span style="width:12px; height:12px; border-radius:3px; background:' + t.color + ';"></span>' +
                        '<span style="font-size:14px;">' + t.name + '</span>' +
                    '</label>';
                }).join('');
            }
            openModal('tagAssignModal');
        }

        function toggleProjectTag(projectId, tagId) {
            const p = state.projects.find(x => x.id === projectId);
            if (!p) return;
            if (!p.tagIds) p.tagIds = [];
            const idx = p.tagIds.indexOf(tagId);
            if (idx >= 0) p.tagIds.splice(idx, 1);
            else p.tagIds.push(tagId);
            saveData();
            // Re-render the assign modal checkboxes
            openTagAssign(projectId);
            updateUI();
        }

        // --- WEEKLY OVERVIEW ---
        function getWeekDates(refDate) {
            const d = new Date(refDate + 'T12:00:00');
            const day = d.getDay();
            const monday = new Date(d);
            monday.setDate(d.getDate() - ((day + 6) % 7));
            const dates = [];
            for (let i = 0; i < 7; i++) {
                const dd = new Date(monday);
                dd.setDate(monday.getDate() + i);
                dates.push(dd.toISOString().split('T')[0]);
            }
            return dates;
        }

        function getISOWeekNumber(dateStr) {
            const d = new Date(dateStr + 'T12:00:00');
            d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
            const yearStart = new Date(d.getFullYear(), 0, 4);
            return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
        }

        function navigateWeek(offset) {
            const d = new Date(uiState.viewWeekStart + 'T12:00:00');
            d.setDate(d.getDate() + offset * 7);
            uiState.viewWeekStart = d.toISOString().split('T')[0];
            updateUI();
        }

        function toggleWeekend() {
            state.settings.showWeekend = !state.settings.showWeekend;
            saveData();
            updateUI();
        }

        function renderWeeklyOverview() {
            const container = document.getElementById('weeklyTableContainer');
            if (!container) return;

            // Lokale Format-Hilfsfunktion: je nach Modus HH:MM oder Dezimal
            const fmtW = (ms) => uiState.weeklyDecimal ? formatMsDecimal(ms) : formatMs(ms, false);

            // Dezimal-Button visuell aktualisieren
            const decBtn = document.getElementById('weeklyDecimalBtn');
            if (decBtn) {
                decBtn.style.opacity = uiState.weeklyDecimal ? '0.9' : '0.6';
                decBtn.querySelector('.material-symbols-rounded').style.color = uiState.weeklyDecimal ? 'var(--md-sys-color-primary)' : '';
                decBtn.title = uiState.weeklyDecimal ? 'Zeitformat: Dezimal (aktiv) – klicken für HH:MM' : 'Zeitformat: HH:MM – klicken für Dezimal';
            }

            const allDates = getWeekDates(uiState.viewWeekStart);
            const todayStr = new Date().toISOString().split('T')[0];
            const weekNum = getISOWeekNumber(allDates[0]);
            document.getElementById('weekLabel').textContent = 'KW ' + weekNum;

            // Update weekend toggle button style
            const wBtn = document.getElementById('weekendToggleBtn');
            if (wBtn) {
                wBtn.style.opacity = state.settings.showWeekend ? '0.9' : '0.4';
                wBtn.querySelector('.material-symbols-rounded').style.color = state.settings.showWeekend ? 'var(--md-sys-color-primary)' : '';
            }

            const allDayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
            // Filter out weekend if setting is off
            const showWeekend = state.settings.showWeekend !== false;
            const dayIndices = showWeekend ? [0,1,2,3,4,5,6] : [0,1,2,3,4]; // Mo-Fr or Mo-So
            const dates = dayIndices.map(i => allDates[i]);
            const dayNames = dayIndices.map(i => allDayNames[i]);

            const activeProjects = state.projects.filter(p => {
                return dates.some(dateStr => calculateNetDurationForDate(p, dateStr) > 0);
            });

            // Order: parents first, then their children (indented)
            const orderedProjects = [];
            const parentProjects = activeProjects.filter(p => !p.parentId);
            parentProjects.forEach(p => {
                orderedProjects.push(p);
                const children = activeProjects.filter(c => c.parentId === p.id);
                children.forEach(c => orderedProjects.push(c));
            });
            // Orphaned sub-projects (parent not in active list)
            activeProjects.filter(p => p.parentId && !parentProjects.find(pp => pp.id === p.parentId)).forEach(p => orderedProjects.push(p));

            // Paket 10.1: Weekly total summary bar
            let weekTotalMs = 0;
            dates.forEach(dateStr => {
                weekTotalMs += state.projects.reduce((sum, p) => sum + calculateNetDurationForDate(p, dateStr), 0);
            });
            const weeklyTargetHours = (state.settings.workdayHours || 10) * 5;
            const weeklyTargetMs = weeklyTargetHours * 3600000;
            const weekPct = weeklyTargetMs > 0 ? (weekTotalMs / weeklyTargetMs) * 100 : 0;
            const weekTotalStr = fmtW(weekTotalMs);
            const weekTargetStr = fmtW(weeklyTargetMs);

            let html = '<div class="week-summary-bar">'
                + '<div class="week-summary-text">'
                + '<span class="material-symbols-rounded" style="font-size:18px;">date_range</span>'
                + '<span><strong>' + weekTotalStr + '</strong> / ' + weekTargetStr + ' Std</span>'
                + '<span class="week-summary-pct">' + Math.round(weekPct) + '%</span>'
                + '</div>'
                + '<div class="week-summary-progress">'
                + '<div class="week-summary-fill" style="width:' + Math.min(weekPct, 100) + '%;"></div>'
                + '</div>'
                + '</div>';

            html += '<table class="weekly-table"><thead><tr>';
            html += '<th class="weekly-num-col">#</th>';
            html += '<th style="text-align:left;">Projekt</th>';
            dates.forEach((dateStr, i) => {
                const d = new Date(dateStr + 'T12:00:00');
                const isToday = dateStr === todayStr;
                html += '<th class="weekly-day-col ' + (isToday ? 'today-col' : '') + '">' + dayNames[i] + '<br>' + d.getDate() + '.' + (d.getMonth() + 1) + '</th>';
            });
            html += '<th>Summe</th></tr></thead><tbody>';

            const dailyTotals = dates.map(() => 0);
            let grandTotal = 0;

            // Helper to render one project row
            function renderWeeklyProjectRow(p, isSub) {
                const indent = isSub ? '<span style="opacity:0.4; margin-right:2px;">↳</span> ' : '';
                const nameStyle = isSub ? 'font-size:12px; opacity:0.85;' : '';
                // Check if this parent has children in the active list
                const hasChildren = !p.parentId && activeProjects.some(c => c.parentId === p.id);
                const isCollapsed = uiState.collapsedWeeklyParents.has(p.id);
                const collapseBtn = hasChildren
                    ? '<span class="weekly-collapse-btn" onclick="toggleWeeklyCollapse(\'' + p.id + '\')" title="Unterprojekte ' + (isCollapsed ? 'einblenden' : 'ausblenden') + '">'
                      + '<span class="material-symbols-rounded" style="font-size:14px; vertical-align:middle;">' + (isCollapsed ? 'expand_more' : 'expand_less') + '</span>'
                      + '</span>'
                    : '';
                const nameCell = collapseBtn + '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:' + (p.color || '#757575') + '; margin-right:6px; vertical-align:middle;"></span>' + indent + '<span style="' + nameStyle + '">' + p.name + '</span>';

                // Single row per project
                html += '<tr>';
                const numDisplay = (!isSub && p.number && p.number !== '-') ? p.number : '';
                const fullLabel = (isSub && p.parentId ? (activeProjects.find(x => x.id === p.parentId) || {}).name + ' → ' + p.name : p.name) + (p.number && p.number !== '-' ? ' (' + p.number + ')' : '');
                html += '<td class="weekly-num-col">' + escapeHtml(numDisplay) + '</td>';
                html += '<td class="project-name-cell" title="' + escapeHtml(fullLabel) + '">' + nameCell + '</td>';
                let rowTotal = 0;
                dates.forEach((dateStr, i) => {
                    const ms = calculateNetDurationForDate(p, dateStr);
                    const isToday = dateStr === todayStr;
                    dailyTotals[i] += ms;
                    rowTotal += ms;
                    // Collect notes from logs for this project on this date
                    const dayStart = new Date(dateStr + 'T00:00:00').getTime();
                    const dayEnd = dayStart + 86400000;
                    const dayNotes = (p.logs || []).filter(function(log) {
                        const logEnd = log.end || Date.now();
                        return logEnd > dayStart && log.start < dayEnd && log.note;
                    }).map(function(log) {
                        return {
                            time: new Date(Math.max(log.start, dayStart)).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'}),
                            note: log.note
                        };
                    });
                    const noteMarker = dayNotes.length > 0
                        ? '<span class="weekly-note-marker" onclick="showNotePopup(event, \'' + p.id + '\', \'' + dateStr + '\')" title="' + dayNotes.length + ' Notiz' + (dayNotes.length > 1 ? 'en' : '') + '">\ud83d\udcdd</span>'
                        : '';
                    html += '<td class="weekly-day-col ' + (isToday ? 'today-col' : '') + '">'
                        + (ms > 0 ? '<span class="weekly-time-pill">' + fmtW(ms) + '</span>' + noteMarker : '<span style="opacity:0.2;">\u2014</span>')
                        + '</td>';
                });
                grandTotal += rowTotal;
                html += '<td>' + fmtW(rowTotal) + '</td></tr>';
            }

            orderedProjects.forEach(p => {
                const isSub = !!p.parentId;
                // Skip children if parent is collapsed
                if (isSub && p.parentId && uiState.collapsedWeeklyParents.has(p.parentId)) return;
                renderWeeklyProjectRow(p, isSub);
            });

            // Total row
            html += '<tr class="total-row">';
            html += '<td class="weekly-num-col"></td>';
            html += '<td class="project-name-cell">Gesamt</td>';
            dates.forEach((dateStr, i) => {
                const isToday = dateStr === todayStr;
                html += '<td class="' + (isToday ? 'today-col' : '') + '">' + fmtW(dailyTotals[i]) + '</td>';
            });
            html += '<td>' + fmtW(grandTotal) + '</td></tr>';
            html += '</tbody></table>';

            if (orderedProjects.length === 0) {
                html = '<div style="padding:16px; text-align:center; color:var(--md-sys-color-on-surface-variant); font-size:13px; font-style:italic;">Keine Daten f\u00fcr diese Woche.</div>';
            }

            container.innerHTML = html;
        }

        function escapeHtml(str) {
            return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        function toggleWeeklyDecimal() {
            uiState.weeklyDecimal = !uiState.weeklyDecimal;
            renderWeeklyOverview();
        }

        function toggleWeeklyCollapse(parentId) {
            if (uiState.collapsedWeeklyParents.has(parentId)) {
                uiState.collapsedWeeklyParents.delete(parentId);
            } else {
                uiState.collapsedWeeklyParents.add(parentId);
            }
            updateUI();
        }

        function showNotePopup(event, projectId, dateStr) {
            event.stopPropagation();
            // Remove any existing popup
            closeNotePopup();

            const p = state.projects.find(x => x.id === projectId);
            if (!p) return;

            const dayStart = new Date(dateStr + 'T00:00:00').getTime();
            const dayEnd = dayStart + 86400000;
            const dayNotes = (p.logs || []).filter(function(log) {
                const logEnd = log.end || Date.now();
                return logEnd > dayStart && log.start < dayEnd && log.note;
            });

            if (dayNotes.length === 0) return;

            const d = new Date(dateStr + 'T12:00:00');
            const dateLabel = d.getDate() + '.' + (d.getMonth()+1) + '.' + d.getFullYear();

            let popupHtml = '<div class="note-popup-title">' + escapeHtml(p.name) + ' \u00b7 ' + dateLabel + '</div>';
            dayNotes.forEach(function(log) {
                const startTime = new Date(Math.max(log.start, dayStart)).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'});
                const endTime = log.end
                    ? new Date(Math.min(log.end, dayEnd)).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})
                    : 'l\u00e4uft...';
                popupHtml += '<div class="note-popup-item">'
                    + '<span class="note-popup-time">' + startTime + '\u2013' + endTime + '</span>'
                    + '<span class="note-popup-text">' + escapeHtml(log.note) + '</span>'
                    + '</div>';
            });

            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'note-popup-overlay';
            overlay.onclick = closeNotePopup;
            document.body.appendChild(overlay);

            // Create popup
            const popup = document.createElement('div');
            popup.className = 'note-popup';
            popup.id = 'notePopup';
            popup.innerHTML = popupHtml;
            document.body.appendChild(popup);

            // Position near the clicked element
            const rect = event.target.getBoundingClientRect();
            let top = rect.bottom + 6;
            let left = rect.left;

            // Ensure it stays in viewport
            const popupRect = popup.getBoundingClientRect();
            if (top + popupRect.height > window.innerHeight - 20) {
                top = rect.top - popupRect.height - 6;
            }
            if (left + popupRect.width > window.innerWidth - 20) {
                left = window.innerWidth - popupRect.width - 20;
            }

            popup.style.top = top + 'px';
            popup.style.left = Math.max(10, left) + 'px';
        }

        function closeNotePopup() {
            const popup = document.getElementById('notePopup');
            if (popup) popup.remove();
            const overlay = document.querySelector('.note-popup-overlay');
            if (overlay) overlay.remove();
        }

        // --- EXTERNAL LINKS ---
        const LINK_ICON_OPTIONS = [
            { icon: 'home_work', label: 'Home Office' },
            { icon: 'apartment', label: 'D365 / Firma' },
            { icon: 'business', label: 'Unternehmen' },
            { icon: 'calendar_month', label: 'Kalender' },
            { icon: 'mail', label: 'E-Mail' },
            { icon: 'chat', label: 'Chat / Teams' },
            { icon: 'cloud', label: 'Cloud' },
            { icon: 'dashboard', label: 'Dashboard' },
            { icon: 'description', label: 'Dokument' },
            { icon: 'terminal', label: 'DevOps' },
            { icon: 'work', label: 'Arbeit' },
            { icon: 'open_in_new', label: 'Extern' }
        ];

        function getIconPickerOptions(linkIndex) {
            return LINK_ICON_OPTIONS.map(opt =>
                '<button class="icon-picker-option" onclick="selectLinkIcon(' + linkIndex + ', \'' + opt.icon + '\')" data-tooltip="' + opt.label + '">'
                + '<span class="material-symbols-rounded">' + opt.icon + '</span>'
                + '</button>'
            ).join('');
        }

        function toggleIconPicker(index, btn) {
            const picker = document.getElementById('iconPicker_' + index);
            document.querySelectorAll('.icon-picker-dropdown').forEach(p => {
                if (p.id !== 'iconPicker_' + index) p.classList.add('hidden');
            });
            picker.classList.toggle('hidden');
        }

        function selectLinkIcon(index, icon) {
            // Schreibt in pendingSettings — kein direktes saveData() hier (erst bei saveSettings())
            if (!pendingSettings.externalLinks) return;
            if (pendingSettings.externalLinks[index]) {
                pendingSettings.externalLinks[index].icon = icon;
                renderExternalLinksSettings();
            }
        }

        function renderExternalLinksSettings() {
            const container = document.getElementById('externalLinksSettings');
            // Liest aus pendingSettings (nicht aus state) — Änderungen sind noch nicht gespeichert
            const links = pendingSettings.externalLinks || [];
            if (links.length === 0) {
                container.innerHTML = '<div style="font-size:13px; color:var(--md-sys-color-on-surface-variant); font-style:italic;">Noch keine Links konfiguriert.</div>';
                return;
            }
            container.innerHTML = links.map((l, i) => `
                <div class="ext-link-setting-row">
                    <button class="ext-link-icon-picker" onclick="toggleIconPicker(${i}, this)" data-tooltip="Icon wählen">
                        <span class="material-symbols-rounded">${escapeHtml(l.icon || 'open_in_new')}</span>
                    </button>
                    <div class="input-container" style="flex:1; min-width:100px; height:40px;">
                        <input type="text" class="input-field ext-link-label" placeholder="Bezeichnung" value="${escapeHtml(l.label)}" style="font-size:13px;"
                            oninput="if(pendingSettings.externalLinks[${i}]) pendingSettings.externalLinks[${i}].label = this.value.trim()">
                    </div>
                    <div class="input-container" style="flex:2; min-width:160px; height:40px;">
                        <input type="text" class="input-field ext-link-url" placeholder="https://..." value="${escapeHtml(l.url)}" style="font-size:13px;"
                            oninput="if(pendingSettings.externalLinks[${i}]) pendingSettings.externalLinks[${i}].url = this.value.trim()">
                    </div>
                    <button class="icon-btn" onclick="removeExternalLink(${i})" style="width:32px; height:32px; color:var(--md-sys-color-error);">
                        <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
                    </button>
                    <div class="icon-picker-dropdown hidden" id="iconPicker_${i}">
                        ${getIconPickerOptions(i)}
                    </div>
                </div>
            `).join('');
        }

        function addExternalLinkSetting() {
            // Hinzufügen in pendingSettings — noch kein saveData(), erst bei saveSettings()
            if (!pendingSettings.externalLinks) pendingSettings.externalLinks = [];
            if (pendingSettings.externalLinks.length >= 4) return; // max. 4 Links
            pendingSettings.externalLinks.push({ label: '', url: '', icon: 'open_in_new' });
            renderExternalLinksSettings();
            // Focus the new label field
            const rows = document.querySelectorAll('.ext-link-setting-row');
            if (rows.length > 0) rows[rows.length - 1].querySelector('.ext-link-label').focus();
        }

        function removeExternalLink(index) {
            // Entfernen aus pendingSettings — noch kein saveData(), erst bei saveSettings()
            if (!pendingSettings.externalLinks) return;
            pendingSettings.externalLinks.splice(index, 1);
            renderExternalLinksSettings();
        }

        function renderExternalLinksCard() {
            const container = document.getElementById('statusLinksContainer');
            if (!container) return;
            const links = (state.settings.externalLinks || []).slice(0, 4);
            if (links.length === 0) {
                container.style.display = 'none';
                return;
            }
            container.style.display = '';
            container.innerHTML = links.map(l => `
                <button class="status-link-btn" onclick="openExternalLink('${escapeHtml(l.url)}')" title="${escapeHtml(l.label)}">
                    <span class="material-symbols-rounded">${escapeHtml(l.icon || 'open_in_new')}</span>
                    <span class="status-link-label">${escapeHtml(l.label)}</span>
                </button>
            `).join('');
        }

        function openExternalLink(url) {
            if (!url) return;
            window.open(url, '_blank', 'noopener');
        }

        // --- TIMESHEET (Daily Time Log) ---
        let timesheetDate = null;

        function getTimesheetDate() {
            if (!timesheetDate) {
                timesheetDate = new Date().toISOString().split('T')[0];
            }
            return timesheetDate;
        }

        function navigateTimesheetDay(dir) {
            const d = new Date(getTimesheetDate() + 'T12:00:00');
            d.setDate(d.getDate() + dir);
            timesheetDate = d.toISOString().split('T')[0];
            saveData();
            updateUI();
        }

        function goToTimesheetToday() {
            timesheetDate = new Date().toISOString().split('T')[0];
            saveData();
            updateUI();
        }

        function renderTimesheetCard() {
            const container = document.getElementById('timesheetContainer');
            if (!container) return;

            const viewDate = getTimesheetDate();
            const todayStr = new Date().toISOString().split('T')[0];
            const isToday = viewDate === todayStr;
            const now = Date.now();
            const dayStart = new Date(viewDate + 'T00:00:00').getTime();
            const dayEnd = dayStart + 86400000;

            // Update date label
            const lbl = document.getElementById('timesheetDateLabel');
            if (lbl) {
                const d = new Date(viewDate + 'T12:00:00');
                const dayNames = ['So','Mo','Di','Mi','Do','Fr','Sa'];
                lbl.textContent = dayNames[d.getDay()] + ', ' + d.getDate() + '.' + (d.getMonth()+1) + '.' + d.getFullYear();
                lbl.style.color = isToday ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)';
            }

            // Collect all time entries for this day across all projects, sorted by start time
            const entries = [];
            state.projects.forEach(p => {
                (p.logs || []).forEach((log, logIdx) => {
                    const logEnd = log.end || now;
                    if (logEnd > dayStart && log.start < dayEnd) {
                        const clampedStart = Math.max(log.start, dayStart);
                        const clampedEnd = Math.min(logEnd, dayEnd);
                        const parentProject = p.parentId ? state.projects.find(pp => pp.id === p.parentId) : null;
                        entries.push({
                            project: p,
                            parentProject,
                            log,
                            logIdx,
                            clampedStart,
                            clampedEnd,
                            durationMs: clampedEnd - clampedStart,
                            isActive: !log.end
                        });
                    }
                });
            });
            // Pausen für diesen Tag einsammeln und in die Timeline integrieren
            state.pauses.forEach(pause => {
                const pauseEnd = pause.active ? now : pause.endTs;
                if (!pauseEnd || pauseEnd <= dayStart || pause.startTs >= dayEnd) return;
                const clampedStart = Math.max(pause.startTs, dayStart);
                const clampedEnd   = Math.min(pauseEnd, dayEnd);
                entries.push({
                    isPause:     true,
                    pause,
                    clampedStart,
                    clampedEnd,
                    durationMs:  clampedEnd - clampedStart,
                    isActive:    !!pause.active
                });
            });

            entries.sort((a, b) => a.clampedStart - b.clampedStart);

            // Calculate day total
            const dayTotalMs = state.projects.reduce((sum, p) => sum + calculateNetDurationForDate(p, viewDate), 0);
            const rounding = parseInt(state.settings.rounding || 0);
            const dayTotalR = getRoundedMs(dayTotalMs, rounding);

            let html = '';

            // Day summary header
            const projectEntryCount = entries.filter(e => !e.isPause).length;
            const pauseEntryCount   = entries.filter(e => e.isPause).length;
            const entrySummary = projectEntryCount + ' Eintr' + (projectEntryCount === 1 ? 'ag' : 'äge')
                + (pauseEntryCount > 0 ? ' · ' + pauseEntryCount + ' Pause' + (pauseEntryCount > 1 ? 'n' : '') : '');
            html += `<div class="ts-day-summary">
                <div class="ts-day-summary-left">
                    <span class="material-symbols-rounded" style="font-size:20px; color:var(--md-sys-color-primary);">schedule</span>
                    <span class="ts-day-summary-label">${isToday ? 'Heute gearbeitet' : 'Gearbeitet'}</span>
                </div>
                <div class="ts-day-summary-right">
                    <span class="ts-day-summary-time">${formatMs(dayTotalR, false)}</span>
                    <span class="ts-day-summary-entries">${entrySummary}</span>
                </div>
            </div>`;

            if (entries.length === 0) {
                html += '<div style="padding:20px; text-align:center; color:var(--md-sys-color-on-surface-variant); font-size:13px; font-style:italic;">Keine Zeiteinträge für diesen Tag.</div>';
                container.innerHTML = html;
                return;
            }

            // Timeline entries
            html += '<div class="ts-timeline">';
            entries.forEach((entry, i) => {
                const hasLineAfter = i < entries.length - 1;
                const lineHtml = hasLineAfter ? '<div class="ts-entry-timeline-line"></div>' : '';

                // --- Pause-Eintrag ---
                if (entry.isPause) {
                    const startTime = new Date(entry.clampedStart).toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' });
                    const endTime   = entry.isActive
                        ? null
                        : new Date(entry.clampedEnd).toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' });
                    const durationStr = formatMs(entry.durationMs, false);
                    const typeIcon = entry.pause.type === 'auto' ? 'smart_toy' : 'coffee';
                    const typeLabel = entry.pause.label || 'Pause';
                    html += `<div class="ts-entry ${entry.isActive ? 'active' : ''}">
                        <div class="ts-entry-timeline-dot" style="background:var(--md-sys-color-outline);"></div>
                        ${lineHtml}
                        <div class="ts-entry-content" style="opacity:0.75; border-left: 2px solid var(--md-sys-color-outline-variant);">
                            <div class="ts-entry-header">
                                <span class="material-symbols-rounded" style="font-size:15px; color:var(--md-sys-color-on-surface-variant); flex-shrink:0;">${typeIcon}</span>
                                <span class="ts-entry-project" style="color:var(--md-sys-color-on-surface-variant);">${escapeHtml(typeLabel)}</span>
                                <span class="ts-entry-duration" style="color:var(--md-sys-color-on-surface-variant);">${durationStr}</span>
                            </div>
                            <div class="ts-entry-times">
                                <span style="font-size:12px; font-family:'Roboto Mono',monospace; color:var(--md-sys-color-on-surface-variant);">${startTime}</span>
                                <span class="ts-entry-arrow">→</span>
                                ${entry.isActive
                                    ? '<span class="ts-entry-running">läuft...</span>'
                                    : `<span style="font-size:12px; font-family:'Roboto Mono',monospace; color:var(--md-sys-color-on-surface-variant);">${endTime}</span>`
                                }
                            </div>
                        </div>
                    </div>`;
                    return;
                }

                // --- Projekt-Eintrag ---
                const p = entry.project;
                const startTime = new Date(entry.clampedStart).toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' });
                const endTime = entry.isActive ? 'läuft...' : new Date(entry.clampedEnd).toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' });
                const durationStr = formatMs(entry.durationMs, false);
                const pColor = p.color || '#757575';
                const isSub = !!p.parentId;
                const projectLabel = isSub && entry.parentProject
                    ? entry.parentProject.name + ' → ' + p.name
                    : p.name;
                const projectNum = p.number ? '#' + p.number : '';

                html += `<div class="ts-entry ${entry.isActive ? 'active' : ''}">
                    <div class="ts-entry-timeline-dot" style="background:${pColor};"></div>
                    ${lineHtml}
                    <div class="ts-entry-content">
                        <div class="ts-entry-header">
                            <div class="ts-entry-project-info">
                                <span class="ts-entry-project" style="color:${pColor};" title="${escapeHtml(projectLabel)}">${escapeHtml(projectLabel)}</span>
                                ${projectNum ? `<span class="ts-entry-num">${projectNum}</span>` : ''}
                            </div>
                            <span class="ts-entry-duration">${durationStr}</span>
                        </div>
                        <div class="ts-entry-times">
                            <input type="text" class="ts-time-input" value="${startTime}"
                                onchange="updateTimesheetLogTime('${p.id}', ${entry.logIdx}, 'start', this.value, '${viewDate}')"
                                title="Startzeit bearbeiten">
                            <span class="ts-entry-arrow">→</span>
                            ${entry.isActive
                                ? '<span class="ts-entry-running">läuft...</span>'
                                : `<input type="text" class="ts-time-input" value="${endTime}"
                                    onchange="updateTimesheetLogTime('${p.id}', ${entry.logIdx}, 'end', this.value, '${viewDate}')"
                                    title="Endzeit bearbeiten">`
                            }
                            ${!entry.isActive ? `<button class="icon-btn ts-delete-btn" onclick="deleteTimesheetLog('${p.id}', ${entry.logIdx})" title="Eintrag löschen">
                                <span class="material-symbols-rounded" style="font-size:16px">delete</span>
                            </button>` : ''}
                        </div>
                        <div class="ts-entry-note-row">
                            <span class="material-symbols-rounded ts-note-icon">sticky_note_2</span>
                            <input type="text" class="ts-note-input ${entry.log.note ? 'has-note' : ''}"
                                value="${escapeHtml(entry.log.note || '')}"
                                placeholder="Notiz hinzufügen..."
                                onchange="saveTimesheetNote('${p.id}', ${entry.logIdx}, this.value)"
                                onkeydown="if(event.key==='Enter') this.blur();">
                        </div>
                    </div>
                </div>`;
            });
            html += '</div>';

            container.innerHTML = html;

            // 9.1: Check for time overlaps and show warning
            const overlaps = checkTimeOverlaps();
            showOverlapWarning(overlaps);
        }

        function updateTimesheetLogTime(projectId, logIndex, type, value, dateStr) {
            const p = state.projects.find(x => x.id === projectId);
            if (!p || !p.logs[logIndex]) return;
            const log = p.logs[logIndex];
            const newTs = new Date(dateStr + 'T' + value + ':00').getTime();
            if (isNaN(newTs)) return;

            // 9.3: Enhanced validation
            if (type === 'start' && log.end && newTs >= log.end) {
                showAlert('Startzeit muss vor der Endzeit liegen.', { title: 'Ungültige Zeit', icon: 'error' });
                renderTimesheetCard();
                return;
            }
            if (type === 'end' && newTs <= log.start) {
                showAlert('Endzeit muss nach der Startzeit liegen.', { title: 'Ungültige Zeit', icon: 'error' });
                renderTimesheetCard();
                return;
            }

            if (type === 'start') {
                const oldStart = log.start;
                log.start = newTs;
                adjustAdjacentLogs(oldStart, newTs, 'end');
            } else {
                const oldEnd = log.end;
                log.end = newTs;
                adjustAdjacentLogs(oldEnd, newTs, 'start');
            }
            saveData();
            updateUI();
        }

        function saveTimesheetNote(projectId, logIndex, value) {
            const p = state.projects.find(x => x.id === projectId);
            if (!p || !p.logs || !p.logs[logIndex]) return;
            p.logs[logIndex].note = value.trim();
            saveData();
        }

        async function deleteTimesheetLog(projectId, logIndex) {
            const p = state.projects.find(x => x.id === projectId);
            if (!p || !p.logs[logIndex]) return;
            if (p.logs[logIndex].end === null) return;
            const ok = await showConfirm('Diesen Zeiteintrag löschen?', { title: 'Eintrag löschen', icon: 'delete', okText: 'Löschen', danger: true });
            if (!ok) return;
            p.logs.splice(logIndex, 1);
            saveData();
            updateUI();
        }

        // --- UTILS ---
        function formatMs(ms, includeSeconds = true) {
            const s = Math.floor((ms / 1000) % 60);
            const m = Math.floor((ms / (1000 * 60)) % 60);
            const h = Math.floor((ms / (1000 * 60 * 60)));
            const pad = (n) => n.toString().padStart(2, '0');
            return `${pad(h)}:${pad(m)}${includeSeconds ? ':' + pad(s) : ''}`;
        }

        // Dezimalformat: Millisekunden → "h.hh" (z.B. 5400000 → "1.50")
        // Wird in der Wochenübersicht verwendet, wenn uiState.weeklyDecimal aktiv ist.
        function formatMsDecimal(ms) {
            const hours = ms / 3600000;
            return hours.toFixed(2).replace('.', ',');
        }
        function formatTimeInput(ts) {
            const d = new Date(ts);
            return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
        }
        function updateDateDisplay() {
            const d = new Date(uiState.viewDate + 'T12:00:00');
            const options = { weekday: 'short', day: 'numeric', month: 'long' };
            const formatted = d.toLocaleDateString('de-DE', options);
            const isToday = uiState.viewDate === new Date().toISOString().split('T')[0];
            const el = document.getElementById('dateDisplay');
            el.innerText = formatted;
            el.style.color = isToday ? '' : 'var(--md-sys-color-primary)';
        }

        function navigateDate(offset) {
            const d = new Date(uiState.viewDate + 'T12:00:00');
            d.setDate(d.getDate() + offset);
            uiState.viewDate = d.toISOString().split('T')[0];
            updateDateDisplay();
            updateUI();
        }

        function goToToday() {
            uiState.viewDate = new Date().toISOString().split('T')[0];
            updateDateDisplay();
            updateUI();
        }
        function isSameDay(d1, d2) {
            return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
        }
        function toggleCard(btn) {
            const card = btn.closest('.md-card');
            const cardId = card.id;
            // Toggle uiState (Single Source of Truth — kein classList.contains() mehr)
            if (uiState.collapsedCards.has(cardId)) {
                uiState.collapsedCards.delete(cardId);
            } else {
                uiState.collapsedCards.add(cardId);
            }
            const isCollapsed = uiState.collapsedCards.has(cardId);
            // Reflect into DOM
            card.classList.toggle('collapsed', isCollapsed);
            btn.setAttribute('data-tooltip', isCollapsed ? 'Karte aufklappen' : 'Karte einklappen');
            // Lazy-render Timesheet when expanding
            if (cardId === 'card-timesheet' && !isCollapsed) {
                renderTimesheetCard();
            }
            layoutMasonry();
        }

        // --- EXPORT/IMPORT/DRAG ---
        function getFileName(suffix) {
            const prefix = state.settings.filePrefix || 'TimeFlow_Export';
            return `${prefix}_${uiState.viewDate || new Date().toISOString().split('T')[0]}.${suffix}`;
        }

        function downloadCSV() {
            const rounding = parseInt(state.settings.rounding || 0);
            const allDates = getWeekDates(uiState.viewWeekStart);
            const showWeekend = state.settings.showWeekend !== false;
            const dayIndices = showWeekend ? [0,1,2,3,4,5,6] : [0,1,2,3,4];
            const allDayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
            const dates = dayIndices.map(i => allDates[i]);
            const dayNames = dayIndices.map(i => allDayNames[i]);

            // Same active projects + ordering as weekly overview
            const activeProjects = state.projects.filter(p =>
                dates.some(dateStr => calculateNetDurationForDate(p, dateStr) > 0)
            );
            const parentProjects = activeProjects.filter(p => !p.parentId);
            const orderedProjects = [];
            parentProjects.forEach(p => {
                orderedProjects.push(p);
                activeProjects.filter(c => c.parentId === p.id).forEach(c => orderedProjects.push(c));
            });
            activeProjects.filter(p => p.parentId && !parentProjects.find(pp => pp.id === p.parentId)).forEach(p => orderedProjects.push(p));

            // Header row: #; Projekt; Mo dd.mm; Di dd.mm; ...; Gesamt
            const headerDays = dates.map((dateStr, i) => {
                const d = new Date(dateStr + 'T12:00:00');
                return dayNames[i] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '.';
            });
            let csv = '#;Projekt;' + headerDays.join(';') + ';Gesamt\n';

            // Data rows
            orderedProjects.forEach(p => {
                const isSub = !!p.parentId;
                const num = (!isSub && p.number && p.number !== '-') ? p.number : '';
                const parentName = isSub ? ((activeProjects.find(x => x.id === p.parentId) || {}).name || '') : '';
                const name = isSub ? parentName + ' \u2192 ' + p.name : p.name;
                let rowTotal = 0;
                const dayCells = dates.map(dateStr => {
                    const rounded = getRoundedMs(calculateNetDurationForDate(p, dateStr), rounding);
                    rowTotal += rounded;
                    return rounded > 0 ? formatMs(rounded, false) : '';
                });
                csv += '"' + num.replace(/"/g, '""') + '";"' + name.replace(/"/g, '""') + '";'
                    + dayCells.map(c => '"' + c + '"').join(';')
                    + ';"' + (rowTotal > 0 ? formatMs(rowTotal, false) : '') + '"\n';
            });

            // Total row
            const dailyTotals = dates.map(dateStr =>
                orderedProjects.reduce((sum, p) => sum + getRoundedMs(calculateNetDurationForDate(p, dateStr), rounding), 0)
            );
            const grandTotal = dailyTotals.reduce((a, b) => a + b, 0);
            csv += '"";Gesamt;' + dailyTotals.map(ms => '"' + (ms > 0 ? formatMs(ms, false) : '') + '"').join(';')
                + ';"' + (grandTotal > 0 ? formatMs(grandTotal, false) : '') + '"\n';

            // Filename: Prefix_KW8_2026.csv
            const weekNum = getISOWeekNumber(allDates[0]);
            const year = allDates[0].substring(0, 4);
            const prefix = state.settings.filePrefix || 'TimeFlow_Export';
            const filename = prefix + '_KW' + weekNum + '_' + year + '.csv';

            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url; link.download = filename;
            link.click();
        }
        function downloadBackup() {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
            const link = document.createElement('a');
            link.href = dataStr; link.download = getFileName('json'); link.click();
        }
        function restoreBackup(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const loaded = migrateState(JSON.parse(e.target.result));
                    const ok = await showConfirm("Alle aktuellen Daten werden mit dem Backup überschrieben.", { title: 'Backup wiederherstellen?', icon: 'upload_file', okText: 'Überschreiben', danger: true });
                    if (ok) {
                        state.version = loaded.version || 2;
                        state.projects = loaded.projects || [];
                        state.pauses = loaded.pauses || [];
                        state.tags = loaded.tags || [];
                        if (loaded.customTitles) state.customTitles = { ...state.customTitles, ...loaded.customTitles };
                        if (loaded.settings) state.settings = { ...state.settings, ...loaded.settings };
                        saveDataImmediate();
                        await init();
                    }
                } catch (err) { showAlert("Fehler beim Laden: " + err.message, { title: 'Fehler', icon: 'error' }); }
                event.target.value = '';
            };
            reader.readAsText(file);
        }
        function setupDragAndDrop() {
            const container = document.getElementById('cardGrid');
            let draggedItem = null;
            container.addEventListener('dragstart', (e) => {
                const card = e.target.closest('.md-card');
                if(!card) return;
                draggedItem = card;
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            container.addEventListener('dragend', (e) => {
                const card = e.target.closest('.md-card');
                if(!card) return;
                card.classList.remove('dragging');
                draggedItem = null;
                saveGridLayout();
                layoutMasonry();
            });
            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (!draggedItem) return;
                const afterElement = getDragAfterElement(container, e.clientY, e.clientX);
                if (afterElement == null) container.appendChild(draggedItem);
                else container.insertBefore(draggedItem, afterElement);
                layoutMasonry();
            });
        }
        function getDragAfterElement(container, y, x) {
            const draggableElements = [...container.querySelectorAll('.md-card:not(.dragging)')];
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offsetY = y - box.top - box.height / 2;
                const offsetX = x - box.left - box.width / 2;
                // Use combined distance for grid layout (not just Y)
                const dist = Math.sqrt(offsetY * offsetY + offsetX * offsetX);
                if (offsetY < 0 && offsetY > closest.offset) return { offset: offsetY, element: child };
                else return closest;
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }

        // --- GRID LAYOUT (Masonry) ---
        const GRID_GAP = 16;
        let masonryRAF = null;

        function layoutMasonry() {
            // Cancel pending layout
            if (masonryRAF) cancelAnimationFrame(masonryRAF);
            masonryRAF = requestAnimationFrame(_doMasonry);
        }

        function _doMasonry() {
            const container = document.getElementById('cardGrid');
            if (!container) return;
            const cards = [...container.querySelectorAll('.md-card:not(.card-hidden)')];
            if (cards.length === 0) return;

            const containerWidth = container.offsetWidth;
            // Determine if we should use single column
            const isMobile = window.innerWidth <= 768;

            if (isMobile) {
                // Single column: just let CSS flow handle it
                container.style.height = '';
                cards.forEach(card => {
                    card.style.position = '';
                    card.style.top = '';
                    card.style.left = '';
                    card.style.width = '';
                });
                return;
            }

            // Build lookup map from State (Single Source of Truth — kein classList.contains())
            const wideMap = {};
            (state.settings.cardLayout || []).forEach(item => { wideMap[item.id] = !!item.wide; });

            const colWidth = (containerWidth - GRID_GAP) / 2;
            // Track the bottom of each column
            let colHeights = [0, 0];

            cards.forEach(card => {
                const isWide = wideMap[card.id] ?? card.classList.contains('grid-wide');

                if (isWide) {
                    // Wide cards span both columns — place below the tallest column
                    const top = Math.max(colHeights[0], colHeights[1]);
                    card.style.position = 'absolute';
                    card.style.top = top + 'px';
                    card.style.left = '0px';
                    card.style.width = '100%';

                    // Measure height after positioning
                    const h = card.offsetHeight;
                    colHeights[0] = top + h + GRID_GAP;
                    colHeights[1] = top + h + GRID_GAP;
                } else {
                    // Normal card — place in the shorter column
                    const col = colHeights[0] <= colHeights[1] ? 0 : 1;
                    const top = colHeights[col];
                    const left = col === 0 ? 0 : colWidth + GRID_GAP;

                    card.style.position = 'absolute';
                    card.style.top = top + 'px';
                    card.style.left = left + 'px';
                    card.style.width = colWidth + 'px';

                    const h = card.offsetHeight;
                    colHeights[col] = top + h + GRID_GAP;
                }
            });

            // Set container height to tallest column
            container.style.height = Math.max(colHeights[0], colHeights[1]) + 'px';
        }

        function toggleGridWidth(btn) {
            const card = btn.closest('.md-card');
            if (!card) return;
            // State mutieren (Single Source of Truth — kein classList.contains())
            const entry = (state.settings.cardLayout || []).find(x => x.id === card.id);
            if (entry) {
                entry.wide = !entry.wide;
            } else {
                // Karte noch nicht im Layout (Fallback): anhängen
                if (!state.settings.cardLayout) state.settings.cardLayout = [];
                state.settings.cardLayout.push({ id: card.id, wide: true });
            }
            // DOM aus State aktualisieren
            card.classList.toggle('grid-wide', !!(state.settings.cardLayout || []).find(x => x.id === card.id)?.wide);
            saveData();
            layoutMasonry();
        }

        // --- GRID LAYOUT STATE MANAGEMENT ---
        // Single Source of Truth: state.settings.cardLayout (Array of {id, wide}).
        // DOM wird daraus gebaut — nie umgekehrt.

        /**
         * Wendet state.settings.cardLayout auf das DOM an:
         * - Sortiert die Karten im cardGrid in der gespeicherten Reihenfolge
         * - Setzt/entfernt die CSS-Klasse 'grid-wide' gemäß State
         * Wird von updateUI() und loadData() aufgerufen.
         */
        function applyCardOrder() {
            const container = document.getElementById('cardGrid');
            if (!container) return;
            const layout = state.settings.cardLayout || [];

            layout.forEach(item => {
                const el = document.getElementById(item.id);
                if (!el) return;
                // Sortierung: ans Ende hängen — da wir in State-Reihenfolge iterieren,
                // landen die Karten automatisch in der richtigen DOM-Reihenfolge.
                container.appendChild(el);
                // Breite aus State übernehmen (kein classList.contains())
                el.classList.toggle('grid-wide', !!item.wide);
            });
        }

        /**
         * Liest die aktuelle DOM-Reihenfolge nach einem Drag-and-Drop aus
         * und schreibt sie in state.settings.cardLayout (State ← DOM, einmalig nach User-Interaktion).
         * Danach persistiert saveData() den neuen State.
         */
        function saveGridLayout() {
            const cards = [...document.querySelectorAll('#cardGrid .md-card')];
            // Bestehende wide-Werte aus dem State beibehalten; id-Reihenfolge kommt vom DOM
            const currentLayout = state.settings.cardLayout || [];
            state.settings.cardLayout = cards.map(c => {
                const existing = currentLayout.find(x => x.id === c.id);
                return { id: c.id, wide: existing ? !!existing.wide : false };
            });
            saveData();
        }
        // --- PAKET 7: Karten-Sichtbarkeit & Presets ---

        const CARD_ID_TITLE_MAP = {
            'card-progress': 'title_progress',
            'card-new': 'title_new',
            'card-active': 'title_active',
            'card-favorites': 'title_favorites',
            'card-others': 'title_others',
            'card-pauses': 'title_pauses',
            'card-weekly': 'title_weekly',
            'card-links': 'title_links',
            'card-timesheet': 'title_timesheet',
            'card-archive': 'title_archive'
        };

        function toggleCardVisibilityMenu() {
            const menu = document.getElementById('cardVisMenu');
            if (menu.classList.contains('hidden')) {
                renderCardVisibilityMenu();
                const btn = document.getElementById('cardVisBtn');
                const rect = btn.getBoundingClientRect();
                menu.style.top = (rect.bottom + 8) + 'px';
                menu.style.right = (window.innerWidth - rect.right) + 'px';
                menu.style.left = 'auto';
                menu.classList.remove('hidden');
            } else {
                menu.classList.add('hidden');
            }
        }

        function renderCardVisibilityMenu() {
            const menu = document.getElementById('cardVisMenu');
            const hiddenCards = state.settings.hiddenCards || [];
            let html = '';

            // Card toggles
            Object.keys(CARD_ID_TITLE_MAP).forEach(cardId => {
                const titleKey = CARD_ID_TITLE_MAP[cardId];
                const title = state.customTitles[titleKey] || titleKey;
                const isVisible = !hiddenCards.includes(cardId);
                html += `<div class="card-vis-item" onclick="toggleCardVisibility('${cardId}')">
                    <input type="checkbox" ${isVisible ? 'checked' : ''} onclick="event.stopPropagation(); toggleCardVisibility('${cardId}')">
                    <span>${escapeHtml(title)}</span>
                </div>`;
            });

            // Divider + Compact mode
            html += '<div style="border-top:1px solid var(--md-sys-color-outline-variant); margin:4px 0;"></div>';
            html += `<div class="card-vis-item" onclick="toggleCompactMode()">
                <input type="checkbox" id="compactModeCheck" ${state.settings.compactMode ? 'checked' : ''} onclick="event.stopPropagation(); toggleCompactMode()">
                <span class="material-symbols-rounded" style="font-size:18px;">density_small</span>
                Kompaktmodus
            </div>`;

            // Divider + Presets
            html += '<div style="border-top:1px solid var(--md-sys-color-outline-variant); margin:4px 0;"></div>';
            html += `<div style="padding:8px 16px; display:flex; gap:6px;">
                <button class="md-btn md-btn-tonal" onclick="applyPreset('minimal')" style="flex:1; height:32px; font-size:12px;">Minimal</button>
                <button class="md-btn md-btn-tonal" onclick="applyPreset('standard')" style="flex:1; height:32px; font-size:12px;">Standard</button>
                <button class="md-btn md-btn-tonal" onclick="applyPreset('all')" style="flex:1; height:32px; font-size:12px;">Alle</button>
            </div>`;

            menu.innerHTML = html;
        }

        function toggleCardVisibility(cardId) {
            if (!state.settings.hiddenCards) state.settings.hiddenCards = [];
            const idx = state.settings.hiddenCards.indexOf(cardId);
            if (idx >= 0) {
                state.settings.hiddenCards.splice(idx, 1);
            } else {
                state.settings.hiddenCards.push(cardId);
            }
            applyCardVisibility();
            renderCardVisibilityMenu();
            saveData();
            layoutMasonry();
        }

        function applyCardVisibility() {
            const hiddenCards = state.settings.hiddenCards || [];
            Object.keys(CARD_ID_TITLE_MAP).forEach(cardId => {
                let el;
                if (cardId === 'card-progress') {
                    el = document.getElementById('dayProgressContainer');
                } else if (cardId === 'card-links') {
                    el = document.getElementById('statusLinksContainer');
                } else {
                    el = document.getElementById(cardId);
                }
                if (el) {
                    if (hiddenCards.includes(cardId)) {
                        el.classList.add('card-hidden');
                    } else {
                        el.classList.remove('card-hidden');
                    }
                }
            });
        }

        // 7.2 Compact Mode
        function toggleCompactMode() {
            state.settings.compactMode = !state.settings.compactMode;
            applyCompactMode();
            saveData();
            renderCardVisibilityMenu();
            layoutMasonry();
        }

        function applyCompactMode() {
            document.body.setAttribute('data-compact', state.settings.compactMode ? 'true' : 'false');
        }

        // 7.3 Presets
        function applyPreset(name) {
            if (name === 'minimal') {
                state.settings.hiddenCards = Object.keys(CARD_ID_TITLE_MAP).filter(id => id !== 'card-active' && id !== 'card-favorites' && id !== 'card-progress');
            } else if (name === 'standard') {
                state.settings.hiddenCards = ['card-archive', 'card-others'];
            } else if (name === 'all') {
                state.settings.hiddenCards = [];
            }
            saveData();
            applyCardVisibility();
            renderCardVisibilityMenu();
            layoutMasonry();
        }

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            const menu = document.getElementById('cardVisMenu');
            const btn = document.getElementById('cardVisBtn');
            if (menu && !menu.classList.contains('hidden') && !menu.contains(e.target) && !btn.contains(e.target)) {
                menu.classList.add('hidden');
            }
        });

        // --- PAKET 9: Datenqualitaet & Schutz ---

        // 9.1 Time Overlap Warning
        function checkTimeOverlaps() {
            const viewDate = getTimesheetDate();
            const now = Date.now();
            const dayStart = new Date(viewDate + 'T00:00:00').getTime();
            const dayEnd = dayStart + 86400000;

            // Collect all log entries for the current day
            const entries = [];
            state.projects.forEach(p => {
                (p.logs || []).forEach((log, logIdx) => {
                    const logEnd = log.end || now;
                    if (logEnd > dayStart && log.start < dayEnd) {
                        entries.push({
                            projectName: p.name,
                            start: Math.max(log.start, dayStart),
                            end: Math.min(logEnd, dayEnd),
                            isActive: !log.end
                        });
                    }
                });
            });

            // Sort by start time
            entries.sort((a, b) => a.start - b.start);

            // Check for overlaps
            const overlaps = [];
            for (let i = 0; i < entries.length - 1; i++) {
                for (let j = i + 1; j < entries.length; j++) {
                    if (entries[i].end > entries[j].start) {
                        const fmtTime = (ts) => new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                        overlaps.push(
                            `${entries[i].projectName} (${fmtTime(entries[i].start)}-${fmtTime(entries[i].end)}) \u2194 ${entries[j].projectName} (${fmtTime(entries[j].start)}-${fmtTime(entries[j].end)})`
                        );
                    }
                }
            }
            return overlaps;
        }

        function showOverlapWarning(overlaps) {
            const container = document.getElementById('timesheetContainer');
            if (!container) return;
            // Remove existing warning
            const existing = container.querySelector('.ts-overlap-warning');
            if (existing) existing.remove();

            if (overlaps.length === 0) return;

            const warningDiv = document.createElement('div');
            warningDiv.className = 'ts-overlap-warning';
            warningDiv.innerHTML = `<span class="material-symbols-rounded">warning</span>
                <div>${overlaps.map(o => '\u26A0 Zeitüberlappung: ' + escapeHtml(o)).join('<br>')}</div>`;
            container.insertBefore(warningDiv, container.firstChild);
        }

        // 9.2 Undo Mechanism
        function pushUndo(entry) {
            undoStack.push(entry);
            if (undoStack.length > 5) undoStack.shift();
        }

        function undo() {
            if (undoStack.length === 0) return;
            const entry = undoStack.pop();

            if (entry.type === 'deleteProject') {
                // Re-add deleted projects
                entry.data.forEach(p => {
                    if (!state.projects.find(x => x.id === p.id)) {
                        state.projects.push(p);
                    }
                });
            } else if (entry.type === 'feierabend') {
                state.projects = entry.data;
                state.pauses = entry.pauses;
                feierabendActive = false;
            }

            saveData();
            updateUI();
            hideUndoToast();
        }

        function showUndoToast(label) {
            const toast = document.getElementById('undoToast');
            const text = document.getElementById('undoToastText');
            if (!toast || !text) return;
            text.textContent = label;
            toast.classList.remove('hidden');
            if (undoToastTimeout) clearTimeout(undoToastTimeout);
            undoToastTimeout = setTimeout(() => {
                hideUndoToast();
            }, 8000);
        }

        function hideUndoToast() {
            const toast = document.getElementById('undoToast');
            if (toast) toast.classList.add('hidden');
            if (undoToastTimeout) clearTimeout(undoToastTimeout);
        }

        // --- PERSISTENCE ---
        // saveData/saveDataImmediate schreiben in IndexedDB (asynchron, fire-and-forget).
        // Aufrufer müssen NICHT auf das Promise warten — die UI wird nicht blockiert.
        // Das gespeicherte Objekt ist eine tiefe Kopie des state, damit spätere State-Mutationen
        // das bereits in die Queue gestellte Objekt nicht mehr verändern.
        let saveTimeout = null;

        function saveData() {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                const snapshot = JSON.parse(JSON.stringify(state));   // tiefe Kopie
                StorageManager.set(snapshot).catch(err =>
                    console.error('[Storage] saveData fehlgeschlagen:', err)
                );
            }, 300);
        }

        function saveDataImmediate() {
            clearTimeout(saveTimeout);
            const snapshot = JSON.parse(JSON.stringify(state));       // tiefe Kopie
            StorageManager.set(snapshot).catch(err =>
                console.error('[Storage] saveDataImmediate fehlgeschlagen:', err)
            );
        }

        function migrateState(loaded) {
            if (!loaded.version || loaded.version < 2) {
                loaded.version = 2;
                if (!loaded.tags) loaded.tags = [];
                if (!loaded.settings) loaded.settings = {};
                if (!loaded.settings.theme) loaded.settings.theme = 'dark';
                (loaded.projects || []).forEach(p => {
                    if (!p.tagIds) p.tagIds = [];
                });
                // Previous default '1' meant "Exakt" but behaved like "Exact".
                if (loaded.settings.rounding === '1') {
                    loaded.settings.rounding = '0';
                }
            }
            // Ensure greeting field exists (added in later update)
            if (loaded.settings && loaded.settings.greeting === undefined) {
                loaded.settings.greeting = 'Guten Morgen! Bereit für einen produktiven Tag? 🚀';
            }
            // Ensure new settings fields exist
            if (loaded.settings) {
                if (loaded.settings.progressEnabled === undefined) loaded.settings.progressEnabled = true;
                if (!loaded.settings.workdayHours) loaded.settings.workdayHours = 10;
                if (!loaded.settings.yellowPct) loaded.settings.yellowPct = 60;
                if (!loaded.settings.redPct) loaded.settings.redPct = 85;
                if (!loaded.settings.reminders) loaded.settings.reminders = [];
                if (loaded.settings.showWeekend === undefined) loaded.settings.showWeekend = true;
                if (loaded.settings.homeOffice === undefined) loaded.settings.homeOffice = false;
                if (!Array.isArray(loaded.settings.hiddenCards)) loaded.settings.hiddenCards = [];
                if (loaded.settings.compactMode === undefined) loaded.settings.compactMode = false;
                if (!loaded.settings.externalLinks || loaded.settings.externalLinks.length === 0) {
                    loaded.settings.externalLinks = [
                        { label: 'Home Office', url: '', icon: 'home_work' },
                        { label: 'D365', url: '', icon: 'apartment' }
                    ];
                }
            }
            // Ensure parentId exists on all projects and migrate dailyNotes to log.note
            (loaded.projects || []).forEach(p => {
                if (!p.dailyNotes) p.dailyNotes = {};
                if (p.parentId === undefined) p.parentId = null;
                // Migrate dailyNotes to log.note (one-time migration)
                if (p.dailyNotes && Object.keys(p.dailyNotes).length > 0) {
                    Object.entries(p.dailyNotes).forEach(([dateStr, noteText]) => {
                        if (!noteText) return;
                        const dayStart = new Date(dateStr + 'T00:00:00').getTime();
                        const dayEnd = dayStart + 86400000;
                        // Find the first log entry for this day and attach the note
                        const matchingLog = (p.logs || []).find(log => {
                            const logEnd = log.end || Date.now();
                            return logEnd > dayStart && log.start < dayEnd && !log.note;
                        });
                        if (matchingLog) {
                            matchingLog.note = noteText;
                        }
                    });
                    // Clear dailyNotes after migration
                    p.dailyNotes = {};
                }
            });
            // Rename old title if still using old default
            if (loaded.customTitles && loaded.customTitles.title_active === 'Aktuelles Projekt') {
                loaded.customTitles.title_active = 'Aktivitätsbereich';
            }
            // Remove obsolete title_export and title_progress
            if (loaded.customTitles) {
                delete loaded.customTitles.title_export;
                delete loaded.customTitles.title_progress;
            }
            // Remove obsolete card-progress from hiddenCards
            if (loaded.settings && Array.isArray(loaded.settings.hiddenCards)) {
                loaded.settings.hiddenCards = loaded.settings.hiddenCards.filter(id => id !== 'card-progress');
            }
            // Migriere altes tf_order (separater localStorage-Key) nach state.settings.cardLayout.
            // Einmalige Migration: danach wird tf_order gelöscht.
            if (loaded.settings && !Array.isArray(loaded.settings.cardLayout)) {
                const DEFAULT_CARD_LAYOUT = [
                    { id: 'card-new',       wide: false },
                    { id: 'card-active',    wide: false },
                    { id: 'card-favorites', wide: false },
                    { id: 'card-others',    wide: false },
                    { id: 'card-pauses',    wide: false },
                    { id: 'card-weekly',    wide: true  },
                    { id: 'card-links',     wide: false },
                    { id: 'card-timesheet', wide: true  },
                    { id: 'card-archive',   wide: false }
                ];
                try {
                    const oldRaw = localStorage.getItem('tf_order');
                    if (oldRaw) {
                        const oldLayout = JSON.parse(oldRaw);
                        if (Array.isArray(oldLayout) && oldLayout.length > 0) {
                            if (typeof oldLayout[0] === 'string') {
                                // Altes Format: nur IDs
                                loaded.settings.cardLayout = oldLayout.map(id => {
                                    const def = DEFAULT_CARD_LAYOUT.find(d => d.id === id);
                                    return { id, wide: def ? def.wide : false };
                                });
                            } else {
                                // Neues Format: {id, wide}
                                loaded.settings.cardLayout = oldLayout.map(item => ({
                                    id: item.id,
                                    wide: !!item.wide
                                }));
                            }
                            localStorage.removeItem('tf_order'); // Alten Key aufräumen
                        } else {
                            loaded.settings.cardLayout = DEFAULT_CARD_LAYOUT;
                        }
                    } else {
                        loaded.settings.cardLayout = DEFAULT_CARD_LAYOUT;
                    }
                } catch (e) {
                    loaded.settings.cardLayout = DEFAULT_CARD_LAYOUT;
                }
            }
            return loaded;
        }

        async function loadData() {
            // StorageManager.init() führt einmalig die localStorage→IDB-Migration durch
            await StorageManager.init();

            const raw = await StorageManager.get();
            if (raw) {
                const loaded = migrateState(raw);
                state.version = loaded.version || 2;
                state.projects = loaded.projects || [];
                state.pauses = loaded.pauses || [];
                state.tags = loaded.tags || [];
                if (loaded.customTitles) {
                    state.customTitles = { ...state.customTitles, ...loaded.customTitles };
                }
                if (loaded.settings) {
                    state.settings = { ...state.settings, ...loaded.settings };
                }

                state.projects.forEach(p => {
                    if (!p.color && p.category !== 'archive') p.color = getDistinctColor();
                    if (!p.number && p.id !== 'general') p.number = '-';
                    if (!p.tagIds) p.tagIds = [];
                });
            }
            // applyCardOrder() wird von updateUI() aufgerufen — kein separater Aufruf nötig.
            // loadGridLayout() entfernt: tf_order wurde via migrateState() nach
            // state.settings.cardLayout überführt und der Key gelöscht.
        }

        // --- PWA ---
        // manifest.json und Service Worker (sw.js) liegen als statische Dateien im
        // Stammverzeichnis. Kein Blob-Workaround mehr nötig.

        function showUpdateToast() {
            if (document.getElementById('update-toast')) return;
            const toast = document.createElement('div');
            toast.id = 'update-toast';
            toast.className = 'update-toast';
            toast.innerHTML = `
                <span class="material-symbols-rounded" style="color:var(--md-sys-color-primary);font-size:20px;flex-shrink:0;">new_releases</span>
                <span style="flex:1;">Neue Version verfügbar</span>
                <button class="text-btn" style="font-weight:600;color:var(--md-sys-color-primary);white-space:nowrap;" onclick="window.location.reload()">Aktualisieren</button>
                <button class="icon-btn" title="Schließen" onclick="document.getElementById('update-toast').remove()">
                    <span class="material-symbols-rounded" style="font-size:18px;">close</span>
                </button>`;
            document.body.appendChild(toast);
        }

        function setupPWA() {
            // Service Worker registrieren (nur unter HTTP/HTTPS möglich)
            if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
                navigator.serviceWorker.register('./sw.js').then(reg => {
                    console.info('[PWA] Service Worker registriert:', reg.scope);
                    // Bei jedem App-Start sofort auf neue SW-Version prüfen (umgeht 24h-HTTP-Cache)
                    reg.update();
                    // Neu installierter SW wartet auf Aktivierung → skipWaiting auslösen
                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        if (!newWorker) return;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // Neuer SW ist bereit – sofort übernehmen
                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                            }
                        });
                    });
                }).catch(err => {
                    console.warn('[PWA] Service Worker Registrierung fehlgeschlagen:', err.message);
                });
                // Wenn ein neuer SW die Kontrolle übernimmt → Update-Toast anzeigen
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    showUpdateToast();
                });
            } else if (location.protocol === 'file:') {
                console.info('[PWA] file://-Protokoll erkannt. Für vollständige PWA-Unterstützung per HTTP starten:');
                console.info('  → npx serve .   oder   python -m http.server 8080');
                console.info('  → Dann http://localhost:8080/index.html öffnen');
                console.info('  → Alternativ: Chrome/Edge ⋮ → Verknüpfung erstellen → Als Fenster öffnen');
            }

            // Install-Prompt für "Zur Startseite hinzufügen" abfangen
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                window.deferredPWAPrompt = e;
            });
        }

        // init() ist async — unbehandelte Fehler hier würden die App lautlos brechen.
        init().catch(err => {
            console.error('[TimeFlow] Kritischer Startfehler:', err);
            document.body.innerHTML =
                '<div style="display:flex;align-items:center;justify-content:center;height:100vh;' +
                'font-family:sans-serif;background:#111318;color:#A8C7FA;">' +
                '<div style="text-align:center;">' +
                '<h2 style="margin-bottom:8px;">TimeFlow konnte nicht gestartet werden</h2>' +
                '<p style="color:#9EAAB8;">' + err.message + '</p>' +
                '<button onclick="location.reload()" style="margin-top:16px;padding:8px 20px;' +
                'border-radius:8px;border:none;background:#A8C7FA;color:#111318;cursor:pointer;font-size:14px;">' +
                'Neu laden</button></div></div>';
        });
