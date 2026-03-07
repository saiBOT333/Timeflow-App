import { state } from '../state.js';
import { formatMs, getContrastTextColor } from '../utils.js';
import { calculateNetDuration } from '../calculations.js';
import { saveData } from '../storage.js';
import { layoutMasonry } from './masonry.js';

// -----------------------------------------------------------------------
// Modul-Variablen (Runtime-State, nicht persistiert)
// -----------------------------------------------------------------------
let feierabendActive = false;
let activePauseText = null;
let activeReminder = null;
let activeReminderIndex = -1;
let greetingShown = false;
let greetingAnimationRunning = false;

// -----------------------------------------------------------------------
// Getter / Setter (für app.js und timer.js)
// -----------------------------------------------------------------------
export function isFeierabendActive() { return feierabendActive; }
export function setFeierabendActive(val) { feierabendActive = val; }
export function isGreetingRunning() { return greetingAnimationRunning; }
export function isGreetingShown() { return greetingShown; }
export function setActiveReminder(text, idx) {
    activeReminder = text;
    activeReminderIndex = idx;
}

// -----------------------------------------------------------------------
// renderActiveProjectCard
// -----------------------------------------------------------------------
export function renderActiveProjectCard() {
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

// -----------------------------------------------------------------------
// dismissReminder
// -----------------------------------------------------------------------
export function dismissReminder() {
    if (activeReminderIndex >= 0 && state.settings.reminders) {
        const r = state.settings.reminders[activeReminderIndex];
        if (r && !r.recurring && !r.intervalMin) {
            state.settings.reminders.splice(activeReminderIndex, 1);
            saveData();
        }
    }
    activeReminder = null;
    activeReminderIndex = -1;
    document.dispatchEvent(new CustomEvent('stateChanged'));
}

window.dismissReminder = dismissReminder;

// -----------------------------------------------------------------------
// checkPauseStatus
// -----------------------------------------------------------------------
export function checkPauseStatus() {
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

// -----------------------------------------------------------------------
// showGreeting
// -----------------------------------------------------------------------
export function showGreeting() {
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
