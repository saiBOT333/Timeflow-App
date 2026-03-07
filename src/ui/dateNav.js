import { uiState } from '../state.js';
import { updateUI } from './render.js';
import { renderTimesheetCard } from './timesheet.js';
import { layoutMasonry } from './masonry.js';

export function updateDateDisplay() {
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

export { navigateDate, goToToday, toggleCard };
