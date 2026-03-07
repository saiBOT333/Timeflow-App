        import { APP_VERSION, MATERIAL_PALETTE, ARCHIVE_COLOR, CHANGELOG } from './src/config.js';
        import { state, uiState } from './src/state.js';
        import { formatMs, formatMsDecimal, formatTimeInput, incrementTime, isSameDay, hexToRgba, getContrastTextColor, escapeHtml, getWeekDates, getISOWeekNumber } from './src/utils.js';
        import { getRoundedMs, getOverlap, mergeIntervals, calculateNetDuration, calculateNetDurationForDate, calculateNetDurationForRange } from './src/calculations.js';
        import { StorageManager, saveData, saveDataImmediate, migrateState, loadData } from './src/storage.js';
        import { showConfirm, showAlert, resolveConfirmModal } from './src/ui/dialogs.js';
        import { popUndo, hasUndo, hideUndoToast } from './src/undo.js';
        import { toggleManualPause, deletePause, deleteAutoPauseFromTimesheet, endAutoPauseNow, updatePauseTime } from './src/pauses.js';
        import { getDistinctColor, stopProject, addProject, switchProject, stopProjectById, toggleFavorite, setCategory, deleteProject, openProjectEdit, saveProjectEdit, openSubProjectModal, saveSubProject, getChildProjects, isParentProject, calculateProjectTotalMs } from './src/projects.js';
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
        import { renderAutoPausesDisplay, updateAutoPause, addAutoPause, removeAutoPause, toggleAutoPausesPanel, isAutoPausesPanelOpen, getLocalDateStr } from './src/ui/autoPauses.js';
        import { openTimeEdit, renderTimeEditLogs, updateLogTime, deleteLog } from './src/ui/timeEdit.js';
        import { renderActiveProjectCard, showGreeting, isGreetingRunning, isGreetingShown, setFeierabendActive } from './src/ui/activeCard.js';
        import { tick } from './src/timer.js';
        import { updateUI, applyAriaLabels } from './src/ui/render.js';
        import { onGoodMorning, onFeierabend, toggleHomeOffice, updateHomeOfficeBtn } from './src/quickActions.js';

        // editingProjectId → uiState.editingProjectId (src/state.js)
        // _versionClickCount, pendingSettings, LINK_ICON_OPTIONS → src/settings.js

        // greetingShown, greetingAnimationRunning → src/ui/activeCard.js
        // firedRemindersToday → src/timer.js
        // activeReminder, activeReminderIndex → src/ui/activeCard.js
        // feierabendActive → src/ui/activeCard.js
        // activePauseText → src/ui/activeCard.js

        // undoStack, undoToastTimeout → src/undo.js

        // Day start time (for progress bar)
        let dayStartTime = null;

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
        // updateAutoPause, addAutoPause, removeAutoPause, toggleAutoPausesPanel → window-Assigns in src/ui/autoPauses.js
        // openTimeEdit, updateLogTime, deleteLog → window-Assigns in src/ui/timeEdit.js

        // StorageManager, saveData, saveDataImmediate, migrateState, loadData → src/storage.js
        // getLocalDateStr, renderAutoPausesDisplay, updateAutoPause, addAutoPause,
        // removeAutoPause, toggleAutoPausesPanel, isAutoPausesPanelOpen → src/ui/autoPauses.js

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
            if (!isGreetingShown()) {
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

        // applyAriaLabels → src/ui/render.js

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
        // tick, checkAutoStop, checkReminders → src/timer.js

        // renderProgressCard, updateDayProgress → src/ui/progressCard.js
        // getDistinctColor → src/projects.js

        // onGoodMorning, onFeierabend, toggleHomeOffice, updateHomeOfficeBtn → src/quickActions.js

        // addProject, switchProject, startProject, stopProject, stopAllProjects,
        // toggleFavorite, setCategory, deleteProject → src/projects.js

        // toggleManualPause, deletePause, deleteAutoPauseFromTimesheet,
        // endAutoPauseNow, updatePauseTime → src/pauses.js

        // checkPauseStatus → src/ui/activeCard.js
        // showGreeting → src/ui/activeCard.js

        // updateUI, applyAriaLabels → src/ui/render.js
        // stateChanged-Listener → in src/ui/render.js registriert

        // renderActiveProjectCard, dismissReminder → src/ui/activeCard.js

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
        // openTimeEdit, renderTimeEditLogs, updateLogTime, deleteLog → src/ui/timeEdit.js

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
                setFeierabendActive(false);
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
