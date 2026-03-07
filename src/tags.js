import { state, uiState } from './state.js';
import { commitState, notifyStateChanged } from './stateManager.js';

// =============================================================================
// tags.js – Tag-Verwaltung
// =============================================================================

export function addTag() {
    const name = document.getElementById('newTagName').value.trim();
    const color = document.getElementById('newTagColor').value;
    if (!name) return;
    state.tags.push({ id: crypto.randomUUID(), name, color });
    document.getElementById('newTagName').value = '';
    commitState();
    renderTagList();
}

export function deleteTag(tagId) {
    state.tags = state.tags.filter(t => t.id !== tagId);
    state.projects.forEach(p => {
        p.tagIds = (p.tagIds || []).filter(id => id !== tagId);
    });
    if (uiState.filterTagId === tagId) uiState.filterTagId = null;
    commitState();
    renderTagList();
}

export function renderTagList() {
    const container = document.getElementById('tagListContainer');
    if (!container) return;
    if (state.tags.length === 0) {
        container.innerHTML = '<div class="fs-13-variant" style="padding:16px; text-align:center; font-style:italic;">Noch keine Tags erstellt.</div>';
        return;
    }
    container.innerHTML = state.tags.map(t => `
        <div style="display:flex; align-items:center; gap:8px; padding:8px; background:var(--md-sys-color-surface-container-high); border-radius:8px;">
            <span style="width:16px; height:16px; border-radius:4px; background:${t.color}; flex-shrink:0;"></span>
            <span class="fs-14" style="flex:1;">${t.name}</span>
            <button class="icon-btn icon-btn-28 text-error" onclick="deleteTag('${t.id}')">
                <span class="material-symbols-rounded fs-18">delete</span>
            </button>
        </div>
    `).join('');
}

export function renderTagFilter() {
    const container = document.getElementById('tagFilterBar');
    if (!container) return;
    if (state.tags.length === 0) { container.innerHTML = ''; return; }
    let html = '<span class="material-symbols-rounded fs-18 text-variant">filter_alt</span>';
    html += state.tags.map(t => {
        const active = uiState.filterTagId === t.id;
        return '<button onclick="setTagFilter(\'' + t.id + '\')" style="font-size:12px; padding:4px 10px; border-radius:16px; border:1px solid ' + t.color + '; background:' + (active ? t.color + '30' : 'transparent') + '; color:' + t.color + '; cursor:pointer; font-family:var(--font-stack); font-weight:' + (active ? '700' : '400') + ';">' + t.name + '</button>';
    }).join(' ');
    container.innerHTML = html;
}

export function setTagFilter(tagId) {
    uiState.filterTagId = uiState.filterTagId === tagId ? null : tagId;
    notifyStateChanged();
}

export function openTagAssign(projectId, e) {
    if (e) e.stopPropagation();
    const p = state.projects.find(x => x.id === projectId);
    if (!p) return;
    uiState.editingProjectId = projectId;
    document.getElementById('tagAssignProjectTitle').innerText = (p.number || '') + ' ' + p.name;

    const container = document.getElementById('tagAssignList');
    if (state.tags.length === 0) {
        container.innerHTML = '<div class="fs-13-variant" style="padding:16px; text-align:center;">Erstelle zuerst Tags über das Label-Icon im Header.</div>';
    } else {
        container.innerHTML = state.tags.map(t => {
            const checked = (p.tagIds || []).includes(t.id);
            return '<label style="display:flex; align-items:center; gap:12px; padding:10px; background:var(--md-sys-color-surface-container-high); border-radius:8px; cursor:pointer;">' +
                '<input type="checkbox" ' + (checked ? 'checked' : '') + ' onchange="toggleProjectTag(\'' + projectId + '\', \'' + t.id + '\')" style="width:18px; height:18px; accent-color:' + t.color + ';">' +
                '<span style="width:12px; height:12px; border-radius:3px; background:' + t.color + ';"></span>' +
                '<span class="fs-14">' + t.name + '</span>' +
                '</label>';
        }).join('');
    }
    document.getElementById('tagAssignModal').classList.add('open');
}

export function toggleProjectTag(projectId, tagId) {
    const p = state.projects.find(x => x.id === projectId);
    if (!p) return;
    if (!p.tagIds) p.tagIds = [];
    const idx = p.tagIds.indexOf(tagId);
    if (idx >= 0) p.tagIds.splice(idx, 1);
    else p.tagIds.push(tagId);
    commitState();
    // Re-render the assign modal checkboxes
    openTagAssign(projectId);
}
