import { state } from './state.js';
import { APP_VERSION } from './config.js';
import { commitState, persistState } from './stateManager.js';
import { escapeHtml } from './utils.js';
import { showConfirm } from './ui/dialogs.js';

// =============================================================================
// settings.js – Einstellungs-Modal, Erinnerungen, Externe Links
// =============================================================================
// Alle Funktionen, die den Settings-Dialog steuern, sind hier gebündelt.
// pendingSettings ist ein Modul-internes Objekt — es spiegelt den Live-Zustand
// des Dialogs und wird erst bei saveSettings() in state.settings geschrieben.
// Kreisabhängigkeit vermieden: Statt closeModal()/updateUI() aus app.js aufzurufen,
// nutzt dieses Modul direkte DOM-Manipulation + CustomEvent('stateChanged').
// =============================================================================

let pendingSettings = {};
let _versionClickCount = 0;

const LINK_ICON_OPTIONS = [
    { icon: 'home_work',      label: 'Home Office' },
    { icon: 'apartment',      label: 'D365 / Firma' },
    { icon: 'business',       label: 'Unternehmen'  },
    { icon: 'calendar_month', label: 'Kalender'     },
    { icon: 'mail',           label: 'E-Mail'       },
    { icon: 'chat',           label: 'Chat / Teams' },
    { icon: 'cloud',          label: 'Cloud'        },
    { icon: 'dashboard',      label: 'Dashboard'    },
    { icon: 'description',    label: 'Dokument'     },
    { icon: 'terminal',       label: 'DevOps'       },
    { icon: 'work',           label: 'Arbeit'       },
    { icon: 'open_in_new',    label: 'Extern'       }
];

// Privater Helfer: Settings-Modal schliessen + Zustand zurücksetzen
function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('open');
    resetSettingsModalState();
}

// =============================================================================
// SETTINGS MODAL ÖFFNEN
// =============================================================================

export function openSettingsModal(options) {
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

    document.getElementById('settingsModal').classList.add('open');
}

// Wird von app.js's closeModal('settingsModal') aufgerufen
export function resetSettingsModalState() {
    _versionClickCount = 0;
    const btn = document.getElementById('resetAppBtn');
    if (btn) btn.hidden = true;
}

// =============================================================================
// SETTINGS SPEICHERN / RESET
// =============================================================================

export function saveSettings() {
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

    commitState();
    closeSettingsModal();
}

export function onVersionLabelClick() {
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

export async function resetApp() {
    const ok = await showConfirm(
        'Alle Projekte, Zeiteinträge, Pausen und Einstellungen werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.',
        { title: 'App zurücksetzen?', icon: 'restart_alt', okText: 'Alles löschen', danger: true }
    );
    if (!ok) return;

    closeSettingsModal();

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

// =============================================================================
// TIMER-MODUS VORSCHAU
// =============================================================================

export function updateTimerModePreview() {
    const isPulse = pendingSettings.timerMode === 'pulse';
    const standardCard = document.getElementById('timerModeStandardCard');
    const pulseCard = document.getElementById('timerModePulseCard');
    if (standardCard) standardCard.classList.toggle('timer-mode-card--active', !isPulse);
    if (pulseCard) pulseCard.classList.toggle('timer-mode-card--active', isPulse);
}

// =============================================================================
// SETTINGS TABS
// =============================================================================

export function switchSettingsTab(tabId, btn) {
    document.querySelectorAll('.settings-tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
    // Trigger preview update when switching to progress tab
    if (tabId === 'tab-progress') updateProgressPreview();
}

export function updateProgressPreview() {
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

// =============================================================================
// REMINDERS SETTINGS
// =============================================================================

export function renderReminderListSettings() {
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

export function addReminderFromSettings() {
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
    persistState();
    timeEl.value = '';
    textEl.value = '';
    recurringEl.checked = false;
    intervalEl.value = '';
    renderReminderListSettings();
}

export function removeReminder(index) {
    if (!state.settings.reminders) return;
    state.settings.reminders.splice(index, 1);
    persistState();
    renderReminderListSettings();
}

export function openRemindersSettings() {
    openSettingsModal({ tab: 'tab-reminders' });
}

// =============================================================================
// EXTERNE LINKS
// =============================================================================

export function getIconPickerOptions(linkIndex) {
    return LINK_ICON_OPTIONS.map(opt =>
        '<button class="icon-picker-option" onclick="selectLinkIcon(' + linkIndex + ', \'' + opt.icon + '\')" data-tooltip="' + opt.label + '">'
        + '<span class="material-symbols-rounded">' + opt.icon + '</span>'
        + '</button>'
    ).join('');
}

export function toggleIconPicker(index, btn) {
    const picker = document.getElementById('iconPicker_' + index);
    document.querySelectorAll('.icon-picker-dropdown').forEach(p => {
        if (p.id !== 'iconPicker_' + index) p.classList.add('hidden');
    });
    picker.classList.toggle('hidden');
}

export function selectLinkIcon(index, icon) {
    // Schreibt in pendingSettings — kein direktes saveData() hier (erst bei saveSettings())
    if (!pendingSettings.externalLinks) return;
    if (pendingSettings.externalLinks[index]) {
        pendingSettings.externalLinks[index].icon = icon;
        renderExternalLinksSettings();
    }
}

export function renderExternalLinksSettings() {
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

export function addExternalLinkSetting() {
    // Hinzufügen in pendingSettings — noch kein saveData(), erst bei saveSettings()
    if (!pendingSettings.externalLinks) pendingSettings.externalLinks = [];
    if (pendingSettings.externalLinks.length >= 4) return; // max. 4 Links
    pendingSettings.externalLinks.push({ label: '', url: '', icon: 'open_in_new' });
    renderExternalLinksSettings();
    // Focus the new label field
    const rows = document.querySelectorAll('.ext-link-setting-row');
    if (rows.length > 0) rows[rows.length - 1].querySelector('.ext-link-label').focus();
}

export function removeExternalLink(index) {
    // Entfernen aus pendingSettings — noch kein saveData(), erst bei saveSettings()
    if (!pendingSettings.externalLinks) return;
    pendingSettings.externalLinks.splice(index, 1);
    renderExternalLinksSettings();
}

export function renderExternalLinksCard() {
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

export function openExternalLink(url) {
    if (!url) return;
    // Für HTTP/HTTPS: neuer Tab; für Protokoll-URIs (ms-word://, vscode://, etc.): direkter Aufruf
    if (/^https?:\/\//i.test(url)) {
        window.open(url, '_blank', 'noopener');
    } else {
        window.location.href = url;
    }
}
