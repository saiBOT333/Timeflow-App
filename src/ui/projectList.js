import { state, uiState } from '../state.js';
import { ARCHIVE_COLOR } from '../config.js';
import { escapeHtml, getContrastTextColor } from '../utils.js';
import { isParentProject, getChildProjects, calculateProjectTotalMs,
         toggleFavorite, openProjectEdit, openSubProjectModal,
         setCategory, deleteProject, switchProject } from '../projects.js';
import { openTagAssign } from '../tags.js';

// =============================================================================
// ui/projectList.js – Projektlisten rendern, Overflow-Menü, Archiv-Suche
// =============================================================================

// Gibt eine für den Light Mode lesbare Textfarbe zurück (abdunkelt helle Farben)
export function getReadableChipColor(hex) {
    if (document.documentElement.getAttribute('data-theme') !== 'light') return hex;
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    const dr = Math.round(r * 0.50);
    const dg = Math.round(g * 0.50);
    const db = Math.round(b * 0.50);
    return `rgb(${dr},${dg},${db})`;
}

export function renderList(elementId, items) {
    const el = document.getElementById(elementId);
    el.innerHTML = '';

    const isFavList = elementId === 'favoriteProjectsList';

    // Build ordered list: parent projects first, followed by their children
    const orderedItems = [];
    const parentItems = items.filter(p => !p.parentId);
    parentItems.forEach(p => {
        orderedItems.push(p);
        const children = items.filter(c => c.parentId === p.id);
        children.forEach(c => orderedItems.push(c));
    });
    // Orphaned sub-projects (parent not in this list)
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
        li.setAttribute('tabindex', '0');
        li.setAttribute('role', 'button');
        li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); switchProject(p.id); } });

        // --- SPECIAL STYLING FOR FAVORITES ---
        const dotPulseClass = (isRunning && state.settings.timerMode === 'pulse') ? ' color-dot-pulse' : '';
        let dotHtml = `<div class="color-dot${dotPulseClass}" style="background-color: ${pColor}"></div>`;

        if (isFavList) {
            li.classList.add('list-item--fav');
        }

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

        // Info icon for "Allgemein" project
        const generalInfoIcon = p.id === 'general' ? '<span class="material-symbols-rounded fs-12 op-35" style="margin-left:4px; vertical-align:middle;" data-tooltip="Erfasst die Zeit wenn kein anderes Projekt aktiv ist">info</span>' : '';

        // Budget-Fortschrittsbalken (nur für Hauptprojekte mit gesetztem Budget)
        let budgetBarHtml = '';
        if (!isSub && p.budgetHours != null && p.budgetHours > 0) {
            const totalMs = calculateProjectTotalMs(p);
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

export function toggleCollapseChildren(parentId, e) {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    if (uiState.collapsedParents.has(parentId)) {
        uiState.collapsedParents.delete(parentId);
    } else {
        uiState.collapsedParents.add(parentId);
    }
    document.dispatchEvent(new CustomEvent('stateChanged'));
}

export function filterArchiveList(query, skipNoMsg) {
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

export function toggleProjectMenu(btn, e) {
    e.stopPropagation();
    e.preventDefault();
    const projectId = btn.dataset.projectId;
    const wrap = btn.closest('.proj-menu-wrap');
    const menu = wrap.querySelector('.proj-menu');
    const wasOpen = uiState.openMenuProjectId === projectId;
    closeAllProjectMenus();
    if (!wasOpen) {
        uiState.openMenuProjectId = projectId;
        menu.classList.add('open');
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

export function closeAllProjectMenus() {
    uiState.openMenuProjectId = null;
    document.querySelectorAll('.proj-menu.open').forEach(m => {
        m.classList.remove('open');
        m.style.top = '';
        m.style.bottom = '';
        m.style.left = '';
        m.style.right = '';
    });
}

// Menü schliessen wenn ausserhalb geklickt wird
document.addEventListener('click', (e) => {
    if (!e.target.closest('.proj-menu-wrap')) {
        closeAllProjectMenus();
    }
});

// onclick-Handler für inline HTML verfügbar machen
window.toggleFavorite = toggleFavorite;
window.openProjectEdit = openProjectEdit;
window.openTagAssign = openTagAssign;
window.openSubProjectModal = openSubProjectModal;
window.setCategory = setCategory;
window.deleteProject = deleteProject;
window.toggleProjectMenu = toggleProjectMenu;
window.closeAllProjectMenus = closeAllProjectMenus;
window.toggleCollapseChildren = toggleCollapseChildren;
window.filterArchiveList = filterArchiveList;
