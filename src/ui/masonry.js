import { state } from '../state.js';
import { saveData } from '../storage.js';

// =============================================================================
// ui/masonry.js – Grid-Layout (Masonry) + Drag-and-Drop
// =============================================================================

const GRID_GAP = 16;
let masonryRAF = null;

export function layoutMasonry() {
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

export function toggleGridWidth(btn) {
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
    // updateUI() via stateChanged → renderActiveProjectCard() + layoutMasonry()
    document.dispatchEvent(new CustomEvent('stateChanged'));
}

/**
 * Wendet state.settings.cardLayout auf das DOM an:
 * - Sortiert die Karten im cardGrid in der gespeicherten Reihenfolge
 * - Setzt/entfernt die CSS-Klasse 'grid-wide' gemäß State
 * Wird von updateUI() und loadData() aufgerufen.
 */
export function applyCardOrder() {
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
export function saveGridLayout() {
    const cards = [...document.querySelectorAll('#cardGrid .md-card')];
    // Bestehende wide-Werte aus dem State beibehalten; id-Reihenfolge kommt vom DOM
    const currentLayout = state.settings.cardLayout || [];
    state.settings.cardLayout = cards.map(c => {
        const existing = currentLayout.find(x => x.id === c.id);
        return { id: c.id, wide: existing ? !!existing.wide : false };
    });
    saveData();
}

export function setupDragAndDrop() {
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
