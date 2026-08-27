import { uiState } from '../state.js';
import { formatRolloverMessage } from '../dayRollover.js';
import { showConfirm } from './dialogs.js';
import { setTimesheetDate } from './timesheet.js';
import { layoutMasonry } from './masonry.js';

// =============================================================================
// ui/dayRolloverNotice.js – Hinweis „du hast nicht abgestochen"
// =============================================================================
// Zeigt nach einem Tageswechsel (siehe dayRollover.js), was automatisch
// abgeschlossen wurde, und bietet den direkten Sprung in den Stundenzettel
// des betroffenen Tages an – dort lässt sich die Endzeit korrigieren.
// =============================================================================

/**
 * @param {object} report – Rückgabe von closeOpenDays()
 * @param {{restarted?: boolean}} opts – restarted: die Zeit läuft ab jetzt neu
 */
export async function showRolloverNotice(report, { restarted = true } = {}) {
    if (!report) return;
    await waitForOtherModals();
    const openTimesheet = await showConfirm(formatRolloverMessage(report, { restarted }), {
        title: 'Nicht abgestochen',
        icon: 'schedule',
        okText: 'Stundenzettel prüfen',
        cancelText: 'Alles klar'
    });
    if (openTimesheet) revealTimesheet(report.date);
}

/**
 * Wartet, bis kein anderer Modal-Overlay mehr offen ist.
 * Beim ersten Start nach einem Update liegt sonst der Changelog-Dialog über
 * dem Hinweis und fängt die Klicks ab – der Hinweis wäre nicht bedienbar.
 */
function waitForOtherModals() {
    const blocking = () => document.querySelector('.modal-overlay.open:not(#confirmModal)');
    if (!blocking()) return Promise.resolve();
    return new Promise(resolve => {
        const obs = new MutationObserver(() => {
            if (!blocking()) { obs.disconnect(); resolve(); }
        });
        obs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
    });
}

/** Stundenzettel auf den betroffenen Tag stellen, aufklappen und anspringen. */
function revealTimesheet(dateStr) {
    setTimesheetDate(dateStr);
    const card = document.getElementById('card-timesheet');
    if (!card) return;
    if (card.classList.contains('collapsed')) {
        card.classList.remove('collapsed');
        uiState.collapsedCards.delete('card-timesheet');
        const btn = card.querySelector('[onclick*="toggleCard"]');
        if (btn) btn.setAttribute('data-tooltip', 'Karte einklappen');
        layoutMasonry();
    }
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
