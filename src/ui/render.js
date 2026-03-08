import { state, uiState } from '../state.js';
import { renderActiveProjectCard, isGreetingRunning } from './activeCard.js';
import { renderList, filterArchiveList } from './projectList.js';
import { renderPauses } from './pauseList.js';
import { isAutoPausesPanelOpen, renderAutoPausesDisplay } from './autoPauses.js';
import { renderWeeklyOverview } from './weeklyOverview.js';
import { renderExternalLinksCard } from '../settings.js';
import { renderTimesheetCard } from './timesheet.js';
import { renderProgressCard } from './progressCard.js';
import { renderTagFilter } from '../tags.js';
import { applyCardVisibility, renderCardVisibilityMenu } from './cardVisibility.js';
import { applyCardOrder } from './masonry.js';
import { updateTimeBadges } from './timeBadges.js';
import { layoutMasonry } from './masonry.js';

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

// --- updateUI: Zentraler Render-Entry-Point (Single Source of Truth → DOM) ---
function updateUI() {
    try {
        if (!isGreetingRunning()) {
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
        if (isAutoPausesPanelOpen()) renderAutoPausesDisplay();
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

// stateChanged-Event: Domain-Module dispatchen dieses Event statt updateUI() direkt
// aufzurufen (vermeidet Kreisabhängigkeiten). render.js registriert den Listener selbst.
document.addEventListener('stateChanged', () => updateUI());

export { updateUI, applyAriaLabels };
