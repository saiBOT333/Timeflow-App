        import { APP_VERSION, MATERIAL_PALETTE, ARCHIVE_COLOR, CHANGELOG } from './src/config.js';
        import { state, uiState } from './src/state.js';
        import { formatMs, formatMsDecimal, formatTimeInput, incrementTime, isSameDay, hexToRgba, getContrastTextColor, escapeHtml, getWeekDates, getISOWeekNumber } from './src/utils.js';
        import { getRoundedMs, getOverlap, mergeIntervals, calculateNetDuration, calculateNetDurationForDate, calculateNetDurationForRange } from './src/calculations.js';
        import { StorageManager, saveData, saveDataImmediate, migrateState, loadData } from './src/storage.js';
        import { showConfirm, showAlert, resolveConfirmModal } from './src/ui/dialogs.js';
        import { pushUndo, popUndo, hasUndo, showUndoToast, hideUndoToast } from './src/undo.js';
        import { toggleManualPause, deletePause, deleteAutoPauseFromTimesheet, endAutoPauseNow, updatePauseTime } from './src/pauses.js';
        import { getDistinctColor, startProject, stopProject, stopAllProjects, addProject, switchProject, stopProjectById, toggleFavorite, setCategory, deleteProject, openProjectEdit, saveProjectEdit, openSubProjectModal, saveSubProject, getChildProjects, isParentProject, calculateProjectTotalMs } from './src/projects.js';
        import { addTag, deleteTag, renderTagList, renderTagFilter, setTagFilter, openTagAssign, toggleProjectTag } from './src/tags.js';
        import { setupPWA, showUpdateToast } from './src/pwa.js';
        import { openSettingsModal, resetSettingsModalState, saveSettings, onVersionLabelClick, resetApp, updateTimerModePreview, switchSettingsTab, updateProgressPreview, renderReminderListSettings, addReminderFromSettings, removeReminder, openRemindersSettings, getIconPickerOptions, toggleIconPicker, selectLinkIcon, renderExternalLinksSettings, addExternalLinkSetting, removeExternalLink, renderExternalLinksCard, openExternalLink } from './src/settings.js';
        import { getFileName, downloadCSV, downloadBackup } from './src/export.js';
        import { renderProgressCard, updateDayProgress } from './src/ui/progressCard.js';
        import { layoutMasonry, toggleGridWidth, applyCardOrder, saveGridLayout, setupDragAndDrop } from './src/ui/masonry.js';
        import { applyCardVisibility, renderCardVisibilityMenu, applyCompactMode, toggleCardVisibilityMenu, toggleCardVisibility, toggleCompactMode, applyPreset } from './src/ui/cardVisibility.js';
        import { updateTimeBadges } from './src/ui/timeBadges.js';
        import { renderPauses } from './src/ui/pauseList.js';
        import { renderList, getReadableChipColor, closeAllProjectMenus, filterArchiveList } from './src/ui/projectList.js';
        import { renderWeeklyOverview } from './src/ui/weeklyOverview.js';
        import { renderTimesheetCard, adjustAdjacentLogs } from './src/ui/timesheet.js';

        // editingProjectId → uiState.editingProjectId (src/state.js)
        // _versionClickCount, pendingSettings, LINK_ICON_OPTIONS → src/settings.js

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

        // Pause status text (runtime only, rendered in Aktivitätsbereich)
        let activePauseText = null;

        // =============================================================================
        // GLOBALE ONCLICK-HANDLER
        // Da app.js ein ES-Modul ist, sind Funktionen nicht automatisch global.
        // Für inline onclick="" Handler im generierten HTML und in index.html
        // müssen sie hier explizit als window.XXX registriert werden.
        // =============================================================================

        // --- app.js eigene Funktionen ---
        // (werden weiter unten definiert; hier per Funktion-Hoisting nicht möglich
        //  → Assigns am Ende des Moduls, ODER als arrow functions vorab)
        // Hinweis: Normale function-Deklarationen werden NICHT gehoisted im Modul-Scope.
        // Daher die window-Assigns direkt bei den Funktions-Definitionen.

        // --- Importierte Funktionen aus Domain-Modulen ---
        window.addProject = addProject;
        window.switchProject = switchProject;
        window.stopProjectById = stopProjectById;
        window.toggleManualPause = toggleManualPause;
        window.endAutoPauseNow = endAutoPauseNow;
        window.deleteAutoPauseFromTimesheet = deleteAutoPauseFromTimesheet;
        window.addTag = addTag;
        window.deleteTag = deleteTag;
        window.renderTagList = renderTagList;
        window.setTagFilter = setTagFilter;
        window.toggleProjectTag = toggleProjectTag;
        window.resolveConfirmModal = resolveConfirmModal;
        window.openSettingsModal = openSettingsModal;
        window.saveSettings = saveSettings;
        window.switchSettingsTab = switchSettingsTab;
        window.updateTimerModePreview = updateTimerModePreview;
        window.updateProgressPreview = updateProgressPreview;
        window.addReminderFromSettings = addReminderFromSettings;
        window.removeReminder = removeReminder;
        window.openRemindersSettings = openRemindersSettings;
        window.toggleIconPicker = toggleIconPicker;
        window.selectLinkIcon = selectLinkIcon;
        window.addExternalLinkSetting = addExternalLinkSetting;
        window.removeExternalLink = removeExternalLink;
        window.openExternalLink = openExternalLink;
        window.resetApp = resetApp;
        window.onVersionLabelClick = onVersionLabelClick;
        window.downloadCSV = downloadCSV;
        window.downloadBackup = downloadBackup;
        window.toggleGridWidth = toggleGridWidth;
        window.toggleCardVisibilityMenu = toggleCardVisibilityMenu;
        window.toggleCardVisibility = toggleCardVisibility;
        window.toggleCompactMode = toggleCompactMode;
        window.applyPreset = applyPreset;
        window.saveProjectEdit = saveProjectEdit;
        window.saveSubProject = saveSubProject;

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
            autoPausesPanelOpen = !autoPausesPanelOpen;
            const panel = document.getElementById('autoPausesDisplay');
            const btn = document.querySelector('.auto-pause-toggle-btn');
            panel.hidden = !autoPausesPanelOpen;
            if (btn) btn.classList.toggle('open', autoPausesPanelOpen);
            if (autoPausesPanelOpen) renderAutoPausesDisplay();
            layoutMasonry();
        }

        window.updateAutoPause = updateAutoPause;
        window.addAutoPause = addAutoPause;
        window.removeAutoPause = removeAutoPause;
        window.toggleAutoPausesPanel = toggleAutoPausesPanel;

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

        window.toggleTheme = toggleTheme;

        // --- INIT ---
        async function init() {
            await loadData();

            state.projects.forEach(p => {
                if (!p.color && p.category !== 'archive') p.color = getDistinctColor();
                if (!p.number && p.id !== 'general') p.number = '-';
                if (!p.tagIds) p.tagIds = [];
            });

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
                const anyRunning = state.projects.find(p => p.status === 'running');
                if (!anyRunning) {
                    existingGeneral.status = 'running';
                    existingGeneral.logs.push({ start: Date.now(), end: null });
                }
            }

            // Initialize day start time for progress bar
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
            document.querySelectorAll('#cardGrid .md-card.collapsed').forEach(card => {
                if (card.id) uiState.collapsedCards.add(card.id);
            });
            updateDateDisplay();
            updateHomeOfficeBtn();
            updateUI();
            renderAutoPausesDisplay();
            if (!greetingShown) {
                showGreeting();
            }
            setupDragAndDrop();
            setInterval(tick, 1000);

            window.addEventListener('resize', () => layoutMasonry());

            if (isFirstVisit) {
                showOnboarding();
                localStorage.setItem('tf_version_seen', APP_VERSION);
            } else {
                checkAndShowChangelog();
            }

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const modals = document.querySelectorAll('.modal-overlay:not(.hidden)');
                    if (modals.length > 0) modals[modals.length - 1].classList.add('hidden');
                    closeAllProjectMenus();
                }
            });

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

        window.advanceOnboarding = advanceOnboarding;

        // --- CHANGELOG POPUP ---
        function checkAndShowChangelog() {
            const lastSeen = localStorage.getItem('tf_version_seen');
            if (lastSeen === APP_VERSION) return;
            const entry = CHANGELOG[APP_VERSION];
            if (!entry) {
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

        window.dismissChangelog = dismissChangelog;

        // --- PAKET 11: ARIA Labels ---
        function applyAriaLabels() {
            document.querySelectorAll('[data-tooltip]').forEach(el => {
                if (!el.getAttribute('aria-label')) {
                    el.setAttribute('aria-label', el.getAttribute('data-tooltip'));
                }
            });
            document.querySelectorAll('button[title]:not([aria-label])').forEach(el => {
                el.setAttribute('aria-label', el.getAttribute('title'));
            });
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

        window.saveTitle = saveTitle;

        // --- SETTINGS & MODALS LOGIC ---
        function openModal(id, options) {
            if (id === 'settingsModal') {
                openSettingsModal(options);
                return;
            }
            document.getElementById(id).classList.add('open');
        }

        function closeModal(id) {
            document.getElementById(id).classList.remove('open');
            if (id === 'tagAssignModal' || id === 'projectEditModal' || id === 'timeEditModal' || id === 'subProjectModal') uiState.editingProjectId = null;
            if (id === 'helpModal') document.getElementById('helpIframe').src = '';
            if (id === 'settingsModal') resetSettingsModalState();
        }

        window.openModal = openModal;
        window.closeModal = closeModal;

        // showConfirm, showAlert, resolveConfirmModal → src/ui/dialogs.js

        function openHelpModal() {
            const iframe = document.getElementById('helpIframe');
            iframe.src = 'TimeFlow_Anleitung.html';
            openModal('helpModal');
        }

        function openCardHelp(section) {
            const iframe = document.getElementById('helpIframe');
            iframe.src = 'TimeFlow_Anleitung.html#' + section;
            openModal('helpModal');
        }

        window.openHelpModal = openHelpModal;
        window.openCardHelp = openCardHelp;

        // --- CORE LOGIC ---
        function tick() {
            try {
                const now = Date.now();
                const todayStr = getLocalDateStr();

                if (!state.settings.homeOffice) {
                    const autoPauses = getAutoPauses();
                    autoPauses.forEach(ap => {
                        if (!ap.start || !ap.end || !ap.label) return;
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
            const hasRunning = state.projects.some(p => p.status === 'running');
            if (!hasRunning) return;

            const now = new Date();
            const todayDate = now.toISOString().split('T')[0];
            const currentHHMM = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

            if (firedRemindersToday._date !== todayDate) {
                firedRemindersToday = { _date: todayDate };
            }

            const autoStopKey = 'autoStop_' + autoStopTime;
            if (firedRemindersToday[autoStopKey]) return;

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

            if (firedRemindersToday._date !== todayDate) {
                firedRemindersToday = { _date: todayDate };
            }

            reminders.forEach((r, idx) => {
                const key = r.time + '-' + r.text;
                if (firedRemindersToday[key]) return;

                if (r.intervalMin && r.intervalMin > 0) {
                    const intervalKey = 'interval_' + idx;
                    const lastFired = firedRemindersToday[intervalKey] || 0;
                    const nowMs = Date.now();
                    if (lastFired === 0) {
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

        // renderProgressCard, updateDayProgress → src/ui/progressCard.js
        // getDistinctColor → src/projects.js

        // --- QUICK ACTIONS ---
        function onGoodMorning() {
            feierabendActive = false;
            const running = state.projects.find(p => p.status === 'running');
            if (running) {
                showAlert("Ein Projekt läuft bereits!", { title: 'Start nicht möglich', icon: 'info' });
                return;
            }
            if (state.manualPauseActive) {
                toggleManualPause();
            }
            startProject('general');
            saveData();
            updateUI();
        }

        async function onFeierabend() {
            const ok = await showConfirm("Alle Timer werden gestoppt und ein Backup erstellt.", { title: 'Feierabend?', icon: 'bedtime', okText: 'Feierabend!', cancelText: 'Abbrechen' });
            if (ok) {
                pushUndo({ type: 'feierabend', data: JSON.parse(JSON.stringify(state.projects)), pauses: JSON.parse(JSON.stringify(state.pauses)), timestamp: Date.now(), label: 'Feierabend rückgängig' });
                stopAllProjects();
                if (state.manualPauseActive) {
                   toggleManualPause();
                }
                feierabendActive = true;
                saveDataImmediate();
                updateUI();
                downloadBackup();
                showUndoToast('Feierabend rückgängig');
            }
        }

        function toggleHomeOffice() {
            state.settings.homeOffice = !state.settings.homeOffice;
            if (state.settings.homeOffice) {
                const todayStr = new Date().toISOString().split('T')[0];
                state.pauses = state.pauses.filter(p => {
                    if (p.type !== 'auto') return true;
                    const pDate = new Date(p.startTs).toISOString().split('T')[0];
                    return pDate !== todayStr;
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

        window.onGoodMorning = onGoodMorning;
        window.onFeierabend = onFeierabend;
        window.toggleHomeOffice = toggleHomeOffice;

        // addProject, switchProject, startProject, stopProject, stopAllProjects,
        // toggleFavorite, setCategory, deleteProject → src/projects.js

        // toggleManualPause, deletePause, deleteAutoPauseFromTimesheet,
        // endAutoPauseNow, updatePauseTime → src/pauses.js

        function checkPauseStatus() {
            const now = Date.now();
            const isHO = state.settings.homeOffice;

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

            const hour = new Date().getHours();
            let icon = 'wb_sunny';
            if (hour >= 6 && hour < 10) icon = 'wb_sunny';
            else if (hour >= 10 && hour < 18) icon = 'light_mode';
            else if (hour >= 18 && hour < 21) icon = 'wb_twilight';
            else icon = 'clear_night';

            container.innerHTML = `
                <div class="greeting-container">
                    <span class="material-symbols-rounded greeting-icon">${icon}</span>
                    <div class="greeting-text">
                        <span id="greetingTyped"></span><span class="greeting-cursor" id="greetingCursor"></span>
                    </div>
                </div>
            `;

            const typedEl = document.getElementById('greetingTyped');
            let charIndex = 0;
            const baseSpeed = 45;

            function typeNext() {
                if (charIndex < text.length) {
                    typedEl.textContent += text[charIndex];
                    charIndex++;
                    let delay = baseSpeed + Math.random() * 30;
                    const lastChar = text[charIndex - 1];
                    if (lastChar === '!' || lastChar === '?' || lastChar === '.') delay += 200;
                    else if (lastChar === ',') delay += 100;
                    setTimeout(typeNext, delay);
                } else {
                    setTimeout(() => {
                        const cursor = document.getElementById('greetingCursor');
                        if (cursor) cursor.hidden = true;
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

            setTimeout(typeNext, 600);
        }

        // --- RENDERERS ---

        // --- updateUI: Zentraler Render-Entry-Point (Single Source of Truth → DOM) ---
        function updateUI() {
            try {
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
                const archiveSearchInput = document.getElementById('archiveSearchInput');
                const archiveQuery = archiveSearchInput ? archiveSearchInput.value : '';
                filterArchiveList(archiveQuery, true);
                if (!archiveQuery) {
                    document.getElementById('noArchiveMsg').hidden = archiveItems.length !== 0;
                }

                renderPauses();
                if (autoPausesPanelOpen) renderAutoPausesDisplay();
                renderWeeklyOverview();
                renderExternalLinksCard();
                renderTimesheetCard();
                renderProgressCard();
                renderTagFilter();
                applyCardVisibility();
                applyCardOrder();
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

            const isBanner = !!(state.settings.cardLayout || []).find(x => x.id === 'card-active')?.wide;

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

        window.dismissReminder = dismissReminder;

        // stopProjectById → src/projects.js
        // renderList, getReadableChipColor, closeAllProjectMenus,
        // filterArchiveList, toggleCollapseChildren → src/ui/projectList.js
        // renderPauses → src/ui/pauseList.js
        // updateTimeBadges, calculateNetDurationWithChildren,
        // calculateNetDurationForDateWithChildren → src/ui/timeBadges.js

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
                adjustAdjacentLogs(oldStart, newTs, 'end');
            } else {
                const oldEnd = log.end;
                log.end = newTs;
                adjustAdjacentLogs(oldEnd, newTs, 'start');
            }
            saveData();
            renderTimeEditLogs(p);
            updateUI();
        }

        function deleteLog(projectId, logIndex) {
            const p = state.projects.find(x => x.id === projectId);
            if (!p || !p.logs[logIndex]) return;
            if (p.logs[logIndex].end === null) return;
            p.logs.splice(logIndex, 1);
            saveData();
            renderTimeEditLogs(p);
            updateUI();
        }

        window.openTimeEdit = openTimeEdit;
        window.updateLogTime = updateLogTime;
        window.deleteLog = deleteLog;

        // --- TAGS ---
        // addTag, deleteTag, renderTagList, renderTagFilter, setTagFilter,
        // openTagAssign, toggleProjectTag -> src/tags.js

        // --- WEEKLY OVERVIEW ---
        // navigateWeek, goToCurrentWeek, toggleWeekend, renderWeeklyOverview,
        // toggleWeeklyDecimal, toggleWeeklyCollapse, toggleWeeklyRowMark,
        // showNotePopup, closeNotePopup → src/ui/weeklyOverview.js

        // --- TIMESHEET ---
        // timesheetDate, getTimesheetDate, navigateTimesheetDay, goToTimesheetToday,
        // renderTimesheetCard, updateTimesheetLogTime, saveTimesheetNote,
        // deleteTimesheetLog, adjustAdjacentLogs → src/ui/timesheet.js

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
            if (uiState.collapsedCards.has(cardId)) {
                uiState.collapsedCards.delete(cardId);
            } else {
                uiState.collapsedCards.add(cardId);
            }
            const isCollapsed = uiState.collapsedCards.has(cardId);
            card.classList.toggle('collapsed', isCollapsed);
            btn.setAttribute('data-tooltip', isCollapsed ? 'Karte aufklappen' : 'Karte einklappen');
            if (cardId === 'card-timesheet' && !isCollapsed) {
                renderTimesheetCard();
            }
            layoutMasonry();
        }

        window.navigateDate = navigateDate;
        window.goToToday = goToToday;
        window.toggleCard = toggleCard;

        // --- EXPORT/IMPORT ---
        // getFileName, downloadCSV, downloadBackup → src/export.js
        // setupDragAndDrop, getDragAfterElement, layoutMasonry, _doMasonry,
        // toggleGridWidth, applyCardOrder, saveGridLayout → src/ui/masonry.js
        // CARD_ID_TITLE_MAP, toggleCardVisibilityMenu, renderCardVisibilityMenu,
        // toggleCardVisibility, applyCardVisibility, toggleCompactMode, applyCompactMode,
        // applyPreset → src/ui/cardVisibility.js

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

        window.restoreBackup = restoreBackup;

        // --- PAKET 9: Datenqualität & Schutz ---
        // checkTimeOverlaps, showOverlapWarning → src/ui/timesheet.js

        // pushUndo, popUndo, hasUndo → src/undo.js

        function undo() {
            if (!hasUndo()) return;
            const entry = popUndo();

            if (entry.type === 'deleteProject') {
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

        window.undo = undo;

        // showUndoToast, hideUndoToast → src/undo.js
        // saveData, saveDataImmediate, migrateState, loadData → src/storage.js

        // --- PWA ---
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
