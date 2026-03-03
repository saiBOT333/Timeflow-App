        import { APP_VERSION, MATERIAL_PALETTE, ARCHIVE_COLOR, CHANGELOG } from './src/config.js';
        import { state, uiState } from './src/state.js';
        import { formatMs, formatMsDecimal, formatTimeInput, incrementTime, isSameDay, hexToRgba, getContrastTextColor, escapeHtml } from './src/utils.js';
        import { getRoundedMs, getOverlap, mergeIntervals, calculateNetDuration, calculateNetDurationForDate, calculateNetDurationForRange } from './src/calculations.js';
        import { StorageManager, saveData, saveDataImmediate, migrateState, loadData } from './src/storage.js';
        import { showConfirm, showAlert, resolveConfirmModal } from './src/ui/dialogs.js';
        import { pushUndo, popUndo, hasUndo, showUndoToast, hideUndoToast } from './src/undo.js';
        import { toggleManualPause, deletePause, deleteAutoPauseFromTimesheet, endAutoPauseNow, updatePauseTime } from './src/pauses.js';
        import { getDistinctColor, startProject, stopProject, stopAllProjects, addProject, switchProject, stopProjectById, toggleFavorite, setCategory, deleteProject, openProjectEdit, saveProjectEdit, openSubProjectModal, saveSubProject, getChildProjects, isParentProject, calculateProjectTotalMs } from './src/projects.js';
        import { addTag, deleteTag, renderTagList, renderTagFilter, setTagFilter, openTagAssign, toggleProjectTag } from './src/tags.js';
        import { setupPWA, showUpdateToast } from './src/pwa.js';

        // --- LAUFZEIT-ZÄHLER (kein Config-Wert) ---
        let _versionClickCount = 0;

        // --- PENDING SETTINGS (Live-Spiegel des Einstellungs-Dialogs, nicht persistiert) ---
        // Wird beim Öffnen des Settings-Modals aus state befüllt und bei jedem Input-Event
        // synchronisiert. saveSettings() flusht pendingSettings → state, liest nie DOM.
        let pendingSettings = {};

        // editingProjectId → uiState.editingProjectId (src/state.js)

        // Greeting animation state (runtime only)
        let greetingShown = false;
        let greetingAnimationRunning = false;

        // Reminder state (runtime only - tracks which reminders fired today)
        let firedRemindersToday = {};  // key: "HH:MM-text" → true
        let activeReminder = null;     // currently displayed reminder
        let activeReminderIndex = -1;  // index of the currently displayed reminder (for one-time deletion)

        // Feierabend state
        let feierabendActive = false;

        // undoStack, undoToastTimeout → src/undo.js

        // Day start time (for progress bar)
        let dayStartTime = null;

        // Auto-Pauses-Panel offen/geschlossen (runtime only — ersetzt DOM-Class-Abfrage)
        let autoPausesPanelOpen = false;


        // StorageManager, saveData, saveDataImmediate, migrateState, loadData → src/storage.js

        // --- AUTO PAUSES HELPER ---
        function getAutoPauses() {
            return state.settings.autoPauses || [];
        }

        function getLocalDateStr(date) {
            const d = date || new Date();
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        }

        function calcActiveFrom(startTime) {
            const now = new Date();
            const todayStr = getLocalDateStr(now);
            const startDt = new Date(todayStr + 'T' + startTime);
            if (Date.now() >= startDt.getTime()) {
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                return getLocalDateStr(tomorrow);
            }
            return todayStr;
        }

        function timeSelectHtml(value, index, field) {
            const [vh, vm] = (value || '12:00').split(':');
            let opts = '';
            const valMin = parseInt(vm, 10);
            const hasCustomMin = valMin % 5 !== 0;
            for (let h = 0; h < 24; h++) {
                for (let m = 0; m < 60; m += 5) {
                    // Falls aktueller Wert nicht auf 5-Min-Raster liegt, extra einfügen
                    if (hasCustomMin && h === parseInt(vh, 10) && m > valMin && (m - 5) < valMin) {
                        const cv = vh + ':' + vm;
                        opts += `<option value="${cv}" selected>${cv}</option>`;
                    }
                    const v = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
                    const sel = v === value ? 'selected' : '';
                    opts += `<option value="${v}" ${sel}>${v}</option>`;
                }
            }
            const title = field === 'start' ? 'Startzeit' : 'Endzeit';
            return `<select class="auto-pause-time-select" onchange="updateAutoPause(${index}, '${field}', this.value)" title="${title}">${opts}</select>`;
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
                    <span class="material-symbols-rounded fs-16 op-50">schedule_off</span>
                    <span>Keine automatischen Pausen konfiguriert.</span>
                    <button class="auto-pause-add-btn" onclick="addAutoPause()">
                        <span class="material-symbols-rounded fs-14">add</span> Hinzufügen
                    </button>
                </div>`;
                return;
            }

            let html = '<div class="auto-pause-list">';
            html += isHO ? `<div class="fs-11 text-error op-80 mb-6" style="display:flex; align-items:center; gap:4px;">
                <span class="material-symbols-rounded fs-14">info</span> Home Office aktiv — automatische Pausen werden heute nicht ausgelöst
            </div>` : '';

            const todayStr = getLocalDateStr();
            pauses.forEach((ap, i) => {
                const isDelayed = ap.activeFrom && todayStr < ap.activeFrom;
                html += `<div class="auto-pause-row ${isHO ? 'disabled' : ''}">
                    ${timeSelectHtml(ap.start, i, 'start')}
                    <span class="op-40">–</span>
                    ${timeSelectHtml(ap.end, i, 'end')}
                    <input type="text" class="auto-pause-label-input" value="${escapeHtml(ap.label)}"
                        onchange="updateAutoPause(${i}, 'label', this.value)" placeholder="Bezeichnung">
                    ${isDelayed ? `<span class="auto-pause-delayed-badge" title="Startzeit lag bereits in der Vergangenheit">ab morgen</span>` : ''}
                    <button class="icon-btn icon-btn-24 text-error op-50"
                        onclick="removeAutoPause(${i})" title="Automatische Pause entfernen">
                        <span class="material-symbols-rounded fs-16">close</span>
                    </button>
                </div>`;
            });

            html += `<button class="auto-pause-add-btn" onclick="addAutoPause()">
                <span class="material-symbols-rounded fs-14">add</span> Pause hinzufügen
            </button>`;
            html += '</div>';
            container.innerHTML = html;
        }

        function updateAutoPause(index, field, value) {
            const pauses = getAutoPauses();
            if (!pauses[index]) return;
            if (field === 'start' || field === 'end') {
                if (!/^\d{2}:\d{2}$/.test(value)) return;
            }
            pauses[index][field] = value.trim();
            // activeFrom neuberechnen wenn Startzeit geändert wird
            if (field === 'start') {
                pauses[index].activeFrom = calcActiveFrom(value.trim());
            }
            state.settings.autoPauses = pauses;
            saveData();
            updateUI();
        }

        function addAutoPause() {
            const pauses = getAutoPauses();
            const startTime = '12:00';
            pauses.push({ start: startTime, end: '12:30', label: 'Pause', activeFrom: calcActiveFrom(startTime) });
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
            panel.hidden = !autoPausesPanelOpen;
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
            localStorage.setItem('tf_theme', theme);
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

            // Post-load: Fehlende Farben / Nummern / Tags auf geladene Projekte anwenden.
            state.projects.forEach(p => {
                if (!p.color && p.category !== 'archive') p.color = getDistinctColor();
                if (!p.number && p.id !== 'general') p.number = '-';
                if (!p.tagIds) p.tagIds = [];
            });

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
                    <span class="material-symbols-rounded fs-20 text-primary" style="flex-shrink:0; margin-top:1px;">${c.icon}</span>
                    <span class="fs-14-variant" style="line-height:1.5;">${c.text}</span>
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
                    autoStopTime:    state.settings.autoStopTime || '',
                    timerMode:       state.settings.timerMode || 'standard',
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
                document.getElementById('settingsAutoStopTime').value = pendingSettings.autoStopTime || '';
                document.getElementById('timerMode' + (pendingSettings.timerMode === 'pulse' ? 'Pulse' : 'Standard')).checked = true;
                updateTimerModePreview();
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
            if (id === 'tagAssignModal' || id === 'projectEditModal' || id === 'timeEditModal' || id === 'subProjectModal') uiState.editingProjectId = null;
            if (id === 'helpModal') document.getElementById('helpIframe').src = '';
            if (id === 'settingsModal') {
                _versionClickCount = 0;
                const btn = document.getElementById('resetAppBtn');
                if (btn) btn.hidden = true;
            }
        }

        // showConfirm, showAlert, resolveConfirmModal → src/ui/dialogs.js

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
            state.settings.autoStopTime    = pendingSettings.autoStopTime || '';
            state.settings.timerMode       = pendingSettings.timerMode || 'standard';
            // Externe Links: nur vollständige Einträge (label + url) übernehmen
            state.settings.externalLinks   = (pendingSettings.externalLinks || []).filter(l => l.label && l.url);

            saveData();
            closeModal('settingsModal');
            updateUI();
        }

        function onVersionLabelClick() {
            _versionClickCount++;
            const lbl = document.getElementById('settingsVersionLabel');
            const btn = document.getElementById('resetAppBtn');
            if (!lbl) return;

            if (_versionClickCount >= 5) {
                // Button einblenden
                if (btn) { btn.hidden = false; }
                _versionClickCount = 0;
            } else {
                // Visuelles Feedback: kurz aufleuchten
                lbl.classList.add('flash');
                setTimeout(() => { lbl.classList.remove('flash'); }, 150);
            }
        }

        async function resetApp() {
            const ok = await showConfirm(
                'Alle Projekte, Zeiteinträge, Pausen und Einstellungen werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.',
                { title: 'App zurücksetzen?', icon: 'restart_alt', okText: 'Alles löschen', danger: true }
            );
            if (!ok) return;

            closeModal('settingsModal');

            // IndexedDB komplett löschen
            await new Promise((resolve) => {
                const req = indexedDB.deleteDatabase('TimeFlowDB');
                req.onsuccess = resolve;
                req.onerror   = resolve;
                req.onblocked = resolve;
            });

            // Alle localStorage-Keys der App entfernen
            ['tf_state', 'tf_dayStart', 'tf_dayStartDate', 'tf_onboarded', 'tf_version_seen', 'tf_order'].forEach(k => localStorage.removeItem(k));

            // Seite neu laden → App startet frisch mit Onboarding
            location.reload();
        }

        function updateTimerModePreview() {
            const isPulse = pendingSettings.timerMode === 'pulse';
            const standardCard = document.getElementById('timerModeStandardCard');
            const pulseCard = document.getElementById('timerModePulseCard');
            if (standardCard) standardCard.classList.toggle('timer-mode-card--active', !isPulse);
            if (pulseCard) pulseCard.classList.toggle('timer-mode-card--active', isPulse);
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
                container.innerHTML = '<div class="fs-13-variant" style="font-style:italic;">Keine Erinnerungen definiert.</div>';
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
                    <span class="material-symbols-rounded fs-18 text-tertiary">${typeIcon}</span>
                    <span class="fs-13" style="font-family:'Roboto Mono',monospace; min-width:45px;">${r.time}</span>
                    <span class="fs-13" style="flex:1;">${r.text}</span>
                    <span class="fs-11-variant" style="white-space:nowrap;">${typeLabel}</span>
                    <button class="icon-btn icon-btn-28 text-error" onclick="removeReminder(${i})">
                        <span class="material-symbols-rounded fs-18">delete</span>
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
                const todayStr = getLocalDateStr();

                // Skip auto-pauses in Home Office mode
                if (!state.settings.homeOffice) {
                    const autoPauses = getAutoPauses();
                    autoPauses.forEach(ap => {
                        if (!ap.start || !ap.end || !ap.label) return;
                        // Noch nicht aktiv? (neu erstellt/bearbeitet, Startzeit lag bereits in der Vergangenheit)
                        if (ap.activeFrom && todayStr < ap.activeFrom) return;
                        const startDt = new Date(todayStr + 'T' + ap.start);
                        const endDt = new Date(todayStr + 'T' + ap.end);
                        const exists = state.pauses.find(p => p.type === 'auto' && p.startTs === startDt.getTime());
                        const skipped = (state.settings.skippedAutoPauses || []).some(s => s.startTs === startDt.getTime());

                        if (!exists && !skipped && now >= startDt.getTime()) {
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
                checkAutoStop();
                updateDayProgress();
            } catch (err) {
                console.error('tick error:', err);
            }
        }

        // --- AUTO STOP CHECK ---
        function checkAutoStop() {
            const autoStopTime = state.settings.autoStopTime;
            if (!autoStopTime) return;
            // Nur auslösen wenn mind. ein Timer läuft
            const hasRunning = state.projects.some(p => p.status === 'running');
            if (!hasRunning) return;

            const now = new Date();
            const todayDate = now.toISOString().split('T')[0];
            const currentHHMM = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

            // Tages-Reset
            if (firedRemindersToday._date !== todayDate) {
                firedRemindersToday = { _date: todayDate };
            }

            const autoStopKey = 'autoStop_' + autoStopTime;
            if (firedRemindersToday[autoStopKey]) return; // Heute schon ausgelöst

            if (currentHHMM >= autoStopTime) {
                firedRemindersToday[autoStopKey] = true;
                showConfirm(
                    'Automatischer Tagesabschluss um ' + autoStopTime + ' Uhr – alle laufenden Timer jetzt stoppen?',
                    { title: 'Tagesabschluss', icon: 'bedtime', okText: 'Stoppen', cancelText: 'Weiter arbeiten' }
                ).then(confirmed => {
                    if (confirmed) {
                        stopAllProjects();
                        saveData();
                        updateUI();
                    }
                });
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
                container.hidden = true;
                return;
            }
            container.hidden = false;
            const workedMs = getTotalWorkedTodayMs();
            const workdayMs = (state.settings.workdayHours || 10) * 3600000;
            const pct = (workedMs / workdayMs) * 100;
            const displayPct = Math.min(pct, 100);
            const yellowPct = state.settings.yellowPct || 60;
            const redPct = state.settings.redPct || 85;
            let barClass = 'bar--green';
            if (pct > 100) barClass = 'bar--overtime';
            else if (pct >= redPct) barClass = 'bar--red';
            else if (pct >= yellowPct) barClass = 'bar--yellow';
            const nowTime = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const remainMs = Math.max(0, workdayMs - workedMs);
            const estEndTime = new Date(Date.now() + remainMs).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const workedStr = formatMs(workedMs, false);
            const pctLabel = pct > 100
                ? '<span class="overtime-label">' + Math.round(pct) + '%</span> \u00B7 ' + workedStr + ' \u00B7 \u00DCberstunden!'
                : Math.round(pct) + '% \u00B7 ' + workedStr + ' \u00B7 Feierabend ~' + estEndTime;

            container.innerHTML = '<div class="day-progress-wrap" id="dayProgressWrap">'
                + '<div class="day-progress-header">'
                + '<span class="day-progress-clock">\uD83D\uDD50 ' + nowTime + '</span>'
                + '<span class="day-progress-pct">' + pctLabel + '</span>'
                + '</div>'
                + '<div class="day-progress-bar">'
                + '<div class="day-progress-fill ' + barClass + '" id="dayProgressFill" style="width:' + displayPct + '%;"></div>'
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

            let barClass = 'bar--green';
            if (pct > 100) barClass = 'bar--overtime';
            else if (pct >= redPct) barClass = 'bar--red';
            else if (pct >= yellowPct) barClass = 'bar--yellow';

            fill.style.width = displayPct + '%';
            fill.className = 'day-progress-fill ' + barClass;

            // Estimate end time based on worked time and remaining
            const remainMs = Math.max(0, workdayMs - workedMs);
            const estEndTime = new Date(Date.now() + remainMs).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

            // Update clock + percentage text
            const header = wrap.querySelector('.day-progress-header');
            if (header) {
                const nowTime = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                const workedStr = formatMs(workedMs, false);
                const pctLabel = pct > 100
                    ? `<span class="overtime-label">${Math.round(pct)}%</span> · ${workedStr} · Überstunden!`
                    : `${Math.round(pct)}% · ${workedStr} · Feierabend ~${estEndTime}`;
                header.innerHTML = `
                    <span class="day-progress-clock">🕐 ${nowTime}</span>
                    <span class="day-progress-pct">${pctLabel}</span>
                `;
            }
        }


        // getDistinctColor → src/projects.js

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
            btn.classList.toggle('is-active', active);
            const label = document.getElementById('homeOfficeBtnLabel');
            if (label) label.textContent = active ? 'Home Office ✓' : 'Home Office';
        }

        // addProject, switchProject, startProject, stopProject, stopAllProjects,
        // toggleFavorite, setCategory, deleteProject → src/projects.js

        // toggleManualPause, deletePause, deleteAutoPauseFromTimesheet,
        // endAutoPauseNow, updatePauseTime → src/pauses.js

        // Pause status text (runtime only, rendered in Aktivitätsbereich)
        let activePauseText = null;

        function checkPauseStatus() {
            const now = Date.now();
            const isHO = state.settings.homeOffice;

            // Check if currently in a pause — ignore auto-pauses when Home Office is active
            const inManualPause = state.pauses.some(p => {
                if (p.type === 'auto' && isHO) return false;
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
                newPauseText = 'Manuelle Pause';
            } else if (inAutoPause) {
                newPauseText = 'Automatische Pause';
            } else if (inManualPause) {
                newPauseText = 'Manuelle Pause';
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
                        if (cursor) cursor.hidden = true;

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
                document.getElementById('noFavsMsg').hidden = favorites.length !== 0;
                renderList('otherProjectsList', others);
                document.getElementById('noOthersMsg').hidden = others.length !== 0;

                const archiveItems = state.projects.filter(p => p.category === 'archive');
                renderList('archiveProjectsList', archiveItems);
                // Suchfilter nach dem Rendern erneut anwenden (falls aktiv)
                const archiveSearchInput = document.getElementById('archiveSearchInput');
                const archiveQuery = archiveSearchInput ? archiveSearchInput.value : '';
                filterArchiveList(archiveQuery, true);
                if (!archiveQuery) {
                    document.getElementById('noArchiveMsg').hidden = archiveItems.length !== 0;
                }

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

        // stateChanged-Event: Domain-Module (projects, pauses etc.) rufen updateUI()
        // nicht direkt auf (Kreisabhängigkeit), sondern feuern dieses Event.
        document.addEventListener('stateChanged', () => updateUI());

        function renderActiveProjectCard() {
            const container = document.getElementById('activeProjectDisplay');

            // Feierabend state
            if (feierabendActive) {
                container.innerHTML = `
                    <div class="feierabend-display">
                        <div class="feierabend-icon">🎉</div>
                        <div class="feierabend-text">Feierabend!</div>
                        <div class="fs-14-variant mt-8">Schönen Abend! Bis morgen.</div>
                    </div>
                `;
                return;
            }

            const runningProject = state.projects.find(p => p.status === 'running');
            const displayProject = runningProject || state.projects.find(p => p.id === 'general');

            if (!displayProject) {
                 container.innerHTML = '<div class="op-50" style="text-align:center;">Kein aktives Projekt</div>';
                 return;
            }

            const bgColor = displayProject.color || 'var(--md-sys-color-primary-container)';
            const textColor = getContrastTextColor(bgColor);
            const isLightText = textColor === '#FFFBFE';
            const numberBgOpacity = isLightText ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.1)';
            const stopBtnBg = isLightText ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.12)';

            const totalAllTime = calculateNetDuration(displayProject);

            // State ist Single Source of Truth – nicht DOM lesen (Race Condition mit applyCardOrder)
            const isBanner = !!(state.settings.cardLayout || []).find(x => x.id === 'card-active')?.wide;

            // Build pause banner HTML – in beiden Modi als Banner über der Karte
            const isAutoPause = activePauseText === 'Automatische Pause';
            const pauseHtml = activePauseText
                ? `<div class="pause-banner visible">
                       <span class="material-symbols-rounded">pause_circle</span>
                       <span class="fw-500">${activePauseText}</span>
                       ${isAutoPause ? `<button class="pause-banner-end-btn" onclick="endAutoPauseNow()">
                           <span class="material-symbols-rounded fs-16">skip_next</span>
                           Jetzt beenden
                       </button>` : ''}
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
                               <span class="material-symbols-rounded fs-16">close</span>
                               Schließen
                           </span>
                       </div>`
                    : `<div class="reminder-banner" onclick="dismissReminder()">
                           <span class="material-symbols-rounded reminder-banner-icon">notifications_active</span>
                           <span class="reminder-banner-text">${activeReminder}</span>
                           <span class="reminder-banner-close">
                               <span class="material-symbols-rounded fs-16">close</span>
                               Schließen
                           </span>
                       </div>`;
            }
            const parentName = displayProject.parentId
                ? (state.projects.find(pp => pp.id === displayProject.parentId) || {}).name || ''
                : '';
            const parentHtml = displayProject.parentId
                ? `<div class="fs-12 op-60" style="color:inherit;">
                       <span class="material-symbols-rounded fs-14" style="vertical-align:middle;">account_tree</span>
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
            const totalHtml = `<div class="op-75" style="display:flex; align-items:center; gap:6px;">
                <span class="material-symbols-rounded fs-16" style="color:inherit;">history</span>
                <span class="active-project-total fs-14" data-pid="${displayProject.id}" style="font-family:'Roboto Mono', monospace; color:inherit;">${formatMs(totalAllTime, false)}</span>
                <span class="fs-11" style="color:inherit;">Gesamt</span>
            </div>`;

            const cardInner = isBanner
                ? `<div class="active-project-card active-banner-mode" style="background-color:${bgColor}; color:${textColor};">
                       <div class="banner-section-left">
                           <div class="active-project-number" style="background:${numberBgOpacity}">#${displayProject.number || '-'}</div>
                           ${parentHtml}
                           <div class="active-project-name">${displayProject.name}</div>
                       </div>
                       <div class="banner-section-center">
                           <div class="active-project-time" data-pid="${displayProject.id}">00:00:00</div>
                           <div class="fs-12 op-65" style="color:inherit; margin-top:2px;">Heute</div>
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
                       <div class="fs-12 op-70" style="color:inherit;">Heute</div>
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

        // stopProjectById → src/projects.js

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
                const dotPulseClass = (isRunning && state.settings.timerMode === 'pulse') ? ' color-dot-pulse' : '';
                let dotHtml = `<div class="color-dot${dotPulseClass}" style="background-color: ${pColor}"></div>`;

                if (isFavList) {
                    li.classList.add('list-item--fav');
                }

                // Sub-project indent styling
                if (isSub) {
                    li.classList.add('list-item--sub');
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
                            <span class="material-symbols-rounded fs-20">more_vert</span>
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
                const subIcon = isSub ? '<span class="material-symbols-rounded fs-14 op-40" style="margin-right:2px;">subdirectory_arrow_right</span>' : '';
                // Inline collapse toggle for parent projects
                const collapseToggle = hasChildren ?
                    '<span class="inline-collapse-btn" onclick="toggleCollapseChildren(\'' + p.id + '\', event)" data-tooltip="' + (uiState.collapsedParents.has(p.id) ? 'Unterprojekte einblenden' : 'Unterprojekte ausblenden') + '">'
                    + '<span class="material-symbols-rounded fs-16">' + (uiState.collapsedParents.has(p.id) ? 'expand_more' : 'expand_less') + '</span></span>'
                    : '';
                // Parent project: show child count if has children
                const collapseIcon = hasChildren && uiState.collapsedParents.has(p.id) ? '<span class="material-symbols-rounded fs-12 op-40" style="margin-left:2px;">more_horiz</span>' : '';
                const childBadge = hasChildren ? `<span class="fs-10 text-primary" style="padding:1px 6px; border-radius:4px; background:rgba(168,199,250,0.15); margin-left:4px;">${getChildProjects(p.id).length} UP${collapseIcon}</span>` : '';

                // Paket 12.2: Info icon for "Allgemein" project
                const generalInfoIcon = p.id === 'general' ? '<span class="material-symbols-rounded fs-12 op-35" style="margin-left:4px; vertical-align:middle;" data-tooltip="Erfasst die Zeit wenn kein anderes Projekt aktiv ist">info</span>' : '';

                // Budget-Fortschrittsbalken (nur für Hauptprojekte mit gesetztem Budget)
                let budgetBarHtml = '';
                if (!isSub && p.budgetHours != null && p.budgetHours > 0) {
                    const totalMs = calculateProjectTotalMs(p);
                    // Unterprojekte einrechnen
                    getChildProjects(p.id).forEach(c => { /* accumuliert beim updateUI */ });
                    const budgetMs = p.budgetHours * 3600000;
                    const pct = Math.min((totalMs / budgetMs) * 100, 100);
                    const usedH = (totalMs / 3600000).toFixed(1);
                    const budgetH = p.budgetHours % 1 === 0 ? p.budgetHours : p.budgetHours.toFixed(1);
                    const colorClass = pct >= 90 ? 'budget-bar-fill--critical' : pct >= 70 ? 'budget-bar-fill--warn' : '';
                    budgetBarHtml = `<div class="budget-bar-wrap" title="${usedH} / ${budgetH} h genutzt (${Math.round(pct)}%)">
                        <div class="budget-bar-track">
                            <div class="budget-bar-fill ${colorClass}" style="width:${pct}%"></div>
                        </div>
                        <span class="budget-bar-label">${usedH}/${budgetH}h</span>
                    </div>`;
                }

                li.innerHTML = `
                    ${dotHtml}
                    <div class="item-content">
                        <div class="item-number">${pNum}${tagChips}${childBadge}</div>
                        <div class="item-text">${collapseToggle}${subIcon}${p.name}${generalInfoIcon}</div>
                        ${budgetBarHtml}
                    </div>
                    <div class="item-times">
                        <span class="time-chip" data-pid="${p.id}" ${isFavList ? `style="border:1px solid ${pColor}30; color:${getReadableChipColor(pColor)};"` : ''}>
                            <span class="time-chip-label">Heute</span>00:00
                        </span>
                        <span class="time-chip-total fs-11-variant op-60" data-pid="${p.id}" style="font-family:'Roboto Mono',monospace;">00:00</span>
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

        // --- ARCHIVE SEARCH ---
        function filterArchiveList(query, skipNoMsg) {
            const list = document.getElementById('archiveProjectsList');
            const noMsg = document.getElementById('noArchiveMsg');
            const noSearchMsg = document.getElementById('noArchiveSearchMsg');
            if (!list) return;
            const q = (query || '').trim().toLowerCase();
            const items = list.querySelectorAll('li');
            let visibleCount = 0;
            items.forEach(li => {
                const text = li.textContent.toLowerCase();
                const show = !q || text.includes(q);
                li.hidden = !show;
                if (show) visibleCount++;
            });
            const totalArchive = state.projects.filter(p => p.category === 'archive').length;
            if (!skipNoMsg) {
                if (noMsg) noMsg.hidden = !(totalArchive === 0 && !q);
            }
            if (noSearchMsg) noSearchMsg.hidden = !(q && visibleCount === 0);
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
                div.className = 'pause-config-item';
                
                div.innerHTML = `
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="material-symbols-rounded fs-18 text-secondary">
                            ${p.type === 'auto' ? 'smart_toy' : 'coffee'}
                        </span>
                        <span class="fs-14">${p.label}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:4px;">
                        <input type="text" value="${startStr}" onchange="updatePauseTime('${p.id}', 'start', this.value)"
                            style="background:transparent; border:none; width:44px; text-align:center; color:var(--md-sys-color-on-surface); font-family:monospace;">
                        <span class="op-50">-</span>
                        <input type="text" value="${endStr}" ${p.active ? 'disabled' : ''} onchange="updatePauseTime('${p.id}', 'end', this.value)"
                            style="background:transparent; border:none; width:44px; text-align:center; color:var(--md-sys-color-on-surface); font-family:monospace;">
                            
                        <button class="icon-btn icon-btn-24 text-error" style="margin-left:8px;"
                            onclick="deletePause('${p.id}')" title="Pause löschen">
                            <span class="material-symbols-rounded fs-18">delete</span>
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
                const isPulseMode = state.settings.timerMode === 'pulse';
                if (activeBadge && activeBadge.dataset.pid === displayProject.id) {
                    // Puls-Modus: Keine Sekunden, Animation statt laufender Zahl
                    if (!isPulseMode) {
                        activeBadge.innerText = formatMs(todayMs, true); // Standard: mit Sekunden
                    } else {
                        // Nur aktualisieren wenn sich die Minute geändert hat (kein Sekunden-Flackern)
                        const minuteStr = formatMs(todayMs, false);
                        if (activeBadge.dataset.lastMinute !== minuteStr) {
                            activeBadge.innerText = minuteStr;
                            activeBadge.dataset.lastMinute = minuteStr;
                        }
                    }
                    // Puls-Klasse setzen/entfernen
                    const isRunningNow = displayProject.status === 'running';
                    activeBadge.classList.toggle('timer-pulse', isPulseMode && isRunningNow);
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
        // openProjectEdit, saveProjectEdit, calculateProjectTotalMs,
        // openSubProjectModal, saveSubProject, getChildProjects, isParentProject → src/projects.js

        // --- TIME EDIT ---
        function openTimeEdit(projectId, e) {
            if (e) e.stopPropagation();
            const p = state.projects.find(x => x.id === projectId);
            if (!p) return;
            uiState.editingProjectId = projectId;
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
                container.innerHTML = '<div class="fs-13-variant" style="padding:16px; text-align:center; font-style:italic;">Keine Eintr\u00e4ge f\u00fcr diesen Tag.</div>';
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
                    '<span class="material-symbols-rounded fs-18 text-variant">schedule</span>' +
                    '<input type="text" value="' + startTime + '" ' +
                        'onchange="updateLogTime(\'' + project.id + '\', ' + log.originalIndex + ', \'start\', this.value)" ' +
                        'class="fs-14 text-on-surface" style="background:transparent; border:none; width:50px; text-align:center; font-family:monospace;">' +
                    '<span class="op-50">\u2192</span>' +
                    (isActive ?
                        '<span class="fs-14 text-primary" style="font-family:monospace;">l\u00e4uft...</span>' :
                        '<input type="text" value="' + endTime + '" ' +
                            'onchange="updateLogTime(\'' + project.id + '\', ' + log.originalIndex + ', \'end\', this.value)" ' +
                            'class="fs-14 text-on-surface" style="background:transparent; border:none; width:50px; text-align:center; font-family:monospace;">') +
                    '<span class="fs-12-variant" style="flex:1; text-align:right; font-family:monospace;">' + formatMs(durationMs, false) + '</span>' +
                    (!isActive ? '<button class="icon-btn icon-btn-24 text-error" onclick="deleteLog(\'' + project.id + '\', ' + log.originalIndex + ')" title="Eintrag l\u00f6schen"><span class="material-symbols-rounded fs-18">delete</span></button>' : '') +
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
        // addTag, deleteTag, renderTagList, renderTagFilter, setTagFilter,
        // openTagAssign, toggleProjectTag -> src/tags.js

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

        function goToCurrentWeek() {
            const todayStr = new Date().toISOString().split('T')[0];
            uiState.viewWeekStart = getWeekDates(todayStr)[0];
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
                decBtn.classList.toggle('is-active', !!uiState.weeklyDecimal);
                decBtn.title = uiState.weeklyDecimal ? 'Zeitformat: Dezimal (aktiv) – klicken für HH:MM' : 'Zeitformat: HH:MM – klicken für Dezimal';
            }

            const allDates = getWeekDates(uiState.viewWeekStart);
            const todayStr = new Date().toISOString().split('T')[0];
            const weekNum = getISOWeekNumber(allDates[0]);
            const isCurrentWeek = uiState.viewWeekStart === getWeekDates(todayStr)[0];
            const weekLabelEl = document.getElementById('weekLabel');
            weekLabelEl.textContent = 'KW ' + weekNum;
            weekLabelEl.classList.toggle('is-current', isCurrentWeek);

            // Update weekend toggle button style
            const wBtn = document.getElementById('weekendToggleBtn');
            if (wBtn) {
                wBtn.classList.toggle('is-active', !!state.settings.showWeekend);
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
                + '<span class="material-symbols-rounded fs-18">date_range</span>'
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

            // dailyTotals immer aus ALLEN Projekten berechnen – unabhängig vom Collapse-Zustand
            const dailyTotals = dates.map((dateStr) =>
                orderedProjects.reduce((sum, p) => sum + calculateNetDurationForDate(p, dateStr), 0)
            );
            const grandTotal = dailyTotals.reduce((a, b) => a + b, 0);

            // Helper to render one project row
            function renderWeeklyProjectRow(p, isSub) {
                const indent = isSub ? '<span class="op-40" style="margin-right:2px;">↳</span> ' : '';
                const nameStyle = isSub ? 'font-size:12px; opacity:0.85;' : '';
                // Check if this parent has children in the active list
                const hasChildren = !p.parentId && activeProjects.some(c => c.parentId === p.id);
                const isCollapsed = uiState.collapsedWeeklyParents.has(p.id);
                const isMarked = uiState.weeklyMarkedRows.has(p.id);
                const collapseBtn = hasChildren
                    ? '<span class="weekly-collapse-btn" onclick="toggleWeeklyCollapse(\'' + p.id + '\')" title="Unterprojekte ' + (isCollapsed ? 'einblenden' : 'ausblenden') + '">'
                      + '<span class="material-symbols-rounded fs-14" style="vertical-align:middle;">' + (isCollapsed ? 'expand_more' : 'expand_less') + '</span>'
                      + '</span>'
                    : '';
                const nameCell = collapseBtn + '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:' + (p.color || '#757575') + '; margin-right:6px; vertical-align:middle;"></span>' + indent + '<span style="' + nameStyle + '">' + p.name + '</span>';

                // Single row per project
                const rowClass = isMarked ? 'weekly-row-marked' : '';
                html += '<tr class="' + rowClass + '" onclick="toggleWeeklyRowMark(event, \'' + p.id + '\')" style="cursor:pointer;" title="Klicken zum Markieren">';
                const numDisplay = (!isSub && p.number && p.number !== '-') ? p.number : '';
                const fullLabel = (isSub && p.parentId ? (activeProjects.find(x => x.id === p.parentId) || {}).name + ' → ' + p.name : p.name) + (p.number && p.number !== '-' ? ' (' + p.number + ')' : '');
                html += '<td class="weekly-num-col">' + escapeHtml(numDisplay) + '</td>';
                html += '<td class="project-name-cell" title="' + escapeHtml(fullLabel) + '">' + nameCell + '</td>';
                let rowTotal = 0;
                let displayRowTotal = 0;
                dates.forEach((dateStr, i) => {
                    const ms = calculateNetDurationForDate(p, dateStr);
                    // Für Elternprojekte: Anzeigezeit = eigene Zeit + Summe der Kinderprojekte
                    let displayMs = ms;
                    if (hasChildren) {
                        activeProjects.filter(c => c.parentId === p.id).forEach(c => {
                            displayMs += calculateNetDurationForDate(c, dateStr);
                        });
                    }
                    const isToday = dateStr === todayStr;
                    rowTotal += ms;
                    displayRowTotal += displayMs;
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
                    // Elternprojekt: Gesamtzeit anzeigen (inkl. Kinder), bei Kindern eigene Zeit
                    const shownMs = hasChildren ? displayMs : ms;
                    html += '<td class="weekly-day-col ' + (isToday ? 'today-col' : '') + '">'
                        + (shownMs > 0 ? '<span class="weekly-time-pill' + (hasChildren && displayMs > ms ? ' weekly-time-pill-total' : '') + '">' + fmtW(shownMs) + '</span>' + noteMarker : '<span class="op-20">\u2014</span>')
                        + '</td>';
                });
                // Elternprojekt: Summen-Spalte zeigt Gesamtzeit inkl. Kinder
                html += '<td>' + fmtW(hasChildren ? displayRowTotal : rowTotal) + '</td></tr>';
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
                html = '<div class="fs-13-variant" style="padding:16px; text-align:center; font-style:italic;">Keine Daten f\u00fcr diese Woche.</div>';
            }

            container.innerHTML = html;
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

        function toggleWeeklyRowMark(event, projectId) {
            // Nicht auslösen bei Klick auf interaktive Elemente in der Zeile
            if (event.target.closest('.weekly-collapse-btn, .weekly-note-marker')) return;
            if (uiState.weeklyMarkedRows.has(projectId)) {
                uiState.weeklyMarkedRows.delete(projectId);
            } else {
                uiState.weeklyMarkedRows.add(projectId);
            }
            renderWeeklyOverview();
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
                container.innerHTML = '<div class="fs-13-variant" style="font-style:italic;">Noch keine Links konfiguriert.</div>';
                return;
            }
            container.innerHTML = links.map((l, i) => `
                <div class="ext-link-setting-row">
                    <button class="ext-link-icon-picker" onclick="toggleIconPicker(${i}, this)" data-tooltip="Icon wählen">
                        <span class="material-symbols-rounded">${escapeHtml(l.icon || 'open_in_new')}</span>
                    </button>
                    <div class="input-container" style="flex:1; min-width:100px; height:40px;">
                        <input type="text" class="input-field ext-link-label fs-13" placeholder="Bezeichnung" value="${escapeHtml(l.label)}"
                            oninput="if(pendingSettings.externalLinks[${i}]) pendingSettings.externalLinks[${i}].label = this.value.trim()">
                    </div>
                    <div class="input-container" style="flex:2; min-width:160px; height:40px;">
                        <input type="text" class="input-field ext-link-url fs-13" placeholder="https://... oder Protokoll-URI" value="${escapeHtml(l.url)}"
                            title="Webadresse (https://...) oder Protokoll-URI eines Programms (z.B. ms-word://, vscode://, obsidian://)"
                            oninput="if(pendingSettings.externalLinks[${i}]) pendingSettings.externalLinks[${i}].url = this.value.trim()">
                    </div>
                    <button class="icon-btn icon-btn-32 text-error" onclick="removeExternalLink(${i})">
                        <span class="material-symbols-rounded fs-18">delete</span>
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
                container.hidden = true;
                return;
            }
            container.hidden = false;
            container.innerHTML = links.map(l => `
                <button class="status-link-btn" onclick="openExternalLink('${escapeHtml(l.url)}')" title="${escapeHtml(l.label)}">
                    <span class="material-symbols-rounded">${escapeHtml(l.icon || 'open_in_new')}</span>
                    <span class="status-link-label">${escapeHtml(l.label)}</span>
                </button>
            `).join('');
        }

        function openExternalLink(url) {
            if (!url) return;
            // Für HTTP/HTTPS: neuer Tab; für Protokoll-URIs (ms-word://, vscode://, etc.): direkter Aufruf
            if (/^https?:\/\//i.test(url)) {
                window.open(url, '_blank', 'noopener');
            } else {
                window.location.href = url;
            }
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
                lbl.classList.toggle('is-today', isToday);
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
                // Aktive Pausen (noch nicht beendet) nur im heutigen Stundenzettel zeigen
                if (pause.active && viewDate !== todayStr) return;
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
                    <span class="material-symbols-rounded fs-20-primary">schedule</span>
                    <span class="ts-day-summary-label">${isToday ? 'Heute gearbeitet' : 'Gearbeitet'}</span>
                </div>
                <div class="ts-day-summary-right">
                    <span class="ts-day-summary-time">${formatMs(dayTotalR, false)}</span>
                    <span class="ts-day-summary-entries">${entrySummary}</span>
                </div>
            </div>`;

            if (entries.length === 0) {
                html += '<div class="fs-13-variant" style="padding:20px; text-align:center; font-style:italic;">Keine Zeiteinträge für diesen Tag.</div>';
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
                        <div class="ts-entry-content op-75" style="border-left: 2px solid var(--md-sys-color-outline-variant);">
                            <div class="ts-entry-header">
                                <span class="material-symbols-rounded fs-15 text-variant" style="flex-shrink:0;">${typeIcon}</span>
                                <span class="ts-entry-project text-variant">${escapeHtml(typeLabel)}</span>
                                <span class="ts-entry-duration text-variant">${durationStr}</span>
                            </div>
                            <div class="ts-entry-times">
                                <span class="fs-12 text-variant" style="font-family:'Roboto Mono',monospace;">${startTime}</span>
                                <span class="ts-entry-arrow">→</span>
                                ${entry.isActive
                                    ? '<span class="ts-entry-running">läuft...</span>'
                                    : `<span class="fs-12 text-variant" style="font-family:'Roboto Mono',monospace;">${endTime}</span>`
                                }
                                ${!entry.isActive
                                    ? `<button class="icon-btn ts-delete-btn" onclick="${entry.pause.type === 'auto' ? `deleteAutoPauseFromTimesheet('${entry.pause.id}')` : `deletePause('${entry.pause.id}')`}" title="Pause löschen"><span class="material-symbols-rounded fs-16">delete</span></button>`
                                    : ''}
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
                                <span class="material-symbols-rounded fs-16">delete</span>
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
        function updateDateDisplay() {
            const d = new Date(uiState.viewDate + 'T12:00:00');
            const options = { weekday: 'short', day: 'numeric', month: 'long' };
            const formatted = d.toLocaleDateString('de-DE', options);
            const isToday = uiState.viewDate === new Date().toISOString().split('T')[0];
            const el = document.getElementById('dateDisplay');
            el.innerText = formatted;
            el.classList.toggle('is-today', isToday);
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

        // Gibt eine für den Light Mode lesbare Textfarbe zurück (abdunkelt helle Farben)
        function getReadableChipColor(hex) {
            if (document.documentElement.getAttribute('data-theme') !== 'light') return hex;
            const r = parseInt(hex.slice(1,3), 16) || 0;
            const g = parseInt(hex.slice(3,5), 16) || 0;
            const b = parseInt(hex.slice(5,7), 16) || 0;
            const dr = Math.round(r * 0.50);
            const dg = Math.round(g * 0.50);
            const db = Math.round(b * 0.50);
            return `rgb(${dr},${dg},${db})`;
        }

        function downloadCSV() {
            const rounding = parseInt(state.settings.rounding || 0);
            const fmt = ms => uiState.weeklyDecimal ? formatMsDecimal(ms) : formatMs(ms, false);
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
                    return rounded > 0 ? fmt(rounded) : '';
                });
                csv += '"' + num.replace(/"/g, '""') + '";"' + name.replace(/"/g, '""') + '";'
                    + dayCells.map(c => '"' + c + '"').join(';')
                    + ';"' + (rowTotal > 0 ? fmt(rowTotal) : '') + '"\n';
            });

            // Total row
            const dailyTotals = dates.map(dateStr =>
                orderedProjects.reduce((sum, p) => sum + getRoundedMs(calculateNetDurationForDate(p, dateStr), rounding), 0)
            );
            const grandTotal = dailyTotals.reduce((a, b) => a + b, 0);
            csv += '"";Gesamt;' + dailyTotals.map(ms => '"' + (ms > 0 ? fmt(ms) : '') + '"').join(';')
                + ';"' + (grandTotal > 0 ? fmt(grandTotal) : '') + '"\n';

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
            // Aktivitätskarte neu rendern, damit Layout (Banner ↔ vertikal) zum neuen Modus passt
            if (card.id === 'card-active') renderActiveProjectCard();
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
                <span class="material-symbols-rounded fs-18">density_small</span>
                Kompaktmodus
            </div>`;

            // Divider + Presets
            html += '<div style="border-top:1px solid var(--md-sys-color-outline-variant); margin:4px 0;"></div>';
            html += `<div style="padding:8px 16px; display:flex; gap:6px;">
                <button class="md-btn md-btn-tonal fs-12" onclick="applyPreset('minimal')" style="flex:1; height:32px;">Minimal</button>
                <button class="md-btn md-btn-tonal fs-12" onclick="applyPreset('standard')" style="flex:1; height:32px;">Standard</button>
                <button class="md-btn md-btn-tonal fs-12" onclick="applyPreset('all')" style="flex:1; height:32px;">Alle</button>
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

        // pushUndo, popUndo, hasUndo → src/undo.js

        function undo() {
            if (!hasUndo()) return;
            const entry = popUndo();

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

        // showUndoToast, hideUndoToast → src/undo.js

        // saveData, saveDataImmediate, migrateState, loadData → src/storage.js

        // --- PWA ---
        // manifest.json und Service Worker (sw.js) liegen als statische Dateien im
        // Stammverzeichnis. Kein Blob-Workaround mehr nötig.

        // showUpdateToast, setupPWA -> src/pwa.js

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
