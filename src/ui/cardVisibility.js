import { state } from '../state.js';
import { persistState } from '../stateManager.js';
import { escapeHtml } from '../utils.js';
import { layoutMasonry } from './masonry.js';

// =============================================================================
// ui/cardVisibility.js – Karten-Sichtbarkeit, Kompaktmodus, Presets
// =============================================================================

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

export function toggleCardVisibilityMenu() {
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

export function renderCardVisibilityMenu() {
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

export function toggleCardVisibility(cardId) {
    if (!state.settings.hiddenCards) state.settings.hiddenCards = [];
    const idx = state.settings.hiddenCards.indexOf(cardId);
    if (idx >= 0) {
        state.settings.hiddenCards.splice(idx, 1);
    } else {
        state.settings.hiddenCards.push(cardId);
    }
    applyCardVisibility();
    renderCardVisibilityMenu();
    persistState();
    layoutMasonry();
}

export function applyCardVisibility() {
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

export function toggleCompactMode() {
    state.settings.compactMode = !state.settings.compactMode;
    applyCompactMode();
    persistState();
    renderCardVisibilityMenu();
    layoutMasonry();
}

export function applyCompactMode() {
    document.body.setAttribute('data-compact', state.settings.compactMode ? 'true' : 'false');
}

export function applyPreset(name) {
    if (name === 'minimal') {
        state.settings.hiddenCards = Object.keys(CARD_ID_TITLE_MAP).filter(id => id !== 'card-active' && id !== 'card-favorites' && id !== 'card-progress');
    } else if (name === 'standard') {
        state.settings.hiddenCards = ['card-archive', 'card-others'];
    } else if (name === 'all') {
        state.settings.hiddenCards = [];
    }
    persistState();
    applyCardVisibility();
    renderCardVisibilityMenu();
    layoutMasonry();
}

// Menü schliessen wenn ausserhalb geklickt wird (läuft beim Import, DOM ist bereit)
document.addEventListener('click', function(e) {
    const menu = document.getElementById('cardVisMenu');
    const btn = document.getElementById('cardVisBtn');
    if (menu && !menu.classList.contains('hidden') && !menu.contains(e.target) && !btn.contains(e.target)) {
        menu.classList.add('hidden');
    }
});
