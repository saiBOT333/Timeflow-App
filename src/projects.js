import { state, uiState } from './state.js';
import { MATERIAL_PALETTE, ARCHIVE_COLOR } from './config.js';
import { commitState, persistState, notifyStateChanged } from './stateManager.js';
import { toggleManualPause } from './pauses.js';
import { showConfirm, showAlert } from './ui/dialogs.js';
import { pushUndo, showUndoToast } from './undo.js';

// =============================================================================
// projects.js – Projekt-Domäne
// =============================================================================
// Alle Funktionen feuern nach State-Änderungen ein 'stateChanged'-Event,
// damit app.js updateUI() aufrufen kann, ohne eine Kreisabhängigkeit zu erzeugen.
// =============================================================================

// --- FARBE ---

export function getDistinctColor() {
    const usedColors = new Set(state.projects.filter(p => p.category !== 'archive').map(p => p.color));
    for (let color of MATERIAL_PALETTE) {
        if (!usedColors.has(color)) return color;
    }
    return MATERIAL_PALETTE[Math.floor(Math.random() * MATERIAL_PALETTE.length)];
}

// --- CORE AKTIONEN ---

export function startProject(idOrObj) {
    const project = typeof idOrObj === 'string' ? state.projects.find(p => p.id === idOrObj) : idOrObj;
    if (project) {
        project.status = 'running';
        project.logs.push({ start: Date.now(), end: null });
    }
}

export function stopProject(project) {
    if (!project || !project.logs || project.logs.length === 0) return;
    project.status = 'stopped';
    const lastLog = project.logs[project.logs.length - 1];
    if (lastLog && !lastLog.end) lastLog.end = Date.now();
}

export function stopAllProjects() {
    state.projects.forEach(p => {
        if (p.status === 'running') stopProject(p);
    });
}

export function addProject() {
    const numInput = document.getElementById('newProjectNum');
    const nameInput = document.getElementById('newProjectName');
    const errMsg = document.getElementById('inputErrorMsg');

    const num = numInput.value.trim();
    const name = nameInput.value.trim();

    if (!num || !name) {
        errMsg.hidden = false;
        return;
    }
    errMsg.hidden = true;

    const newProject = {
        id: crypto.randomUUID(),
        number: num,
        name: name,
        category: 'active',
        isFavorite: true,
        color: getDistinctColor(),
        status: 'stopped',
        logs: [],
        tagIds: [],
        parentId: null
    };

    state.projects.unshift(newProject);
    numInput.value = '';
    nameInput.value = '';
    numInput.focus();
    commitState();
}

export function switchProject(id) {
    const project = state.projects.find(p => p.id === id);
    if (!project) return;
    if (state.manualPauseActive) toggleManualPause();
    if (project.status === 'running') {
        stopProject(project);
        if (id !== 'general') startProject('general');
    } else {
        stopAllProjects();
        startProject(id);
    }
    commitState();
}

export function stopProjectById(id) {
    const p = state.projects.find(x => x.id === id);
    if (p) {
        stopProject(p);
        startProject('general');
        commitState();
    }
}

export function toggleFavorite(id, e) {
    e.stopPropagation();
    const p = state.projects.find(x => x.id === id);
    if (p) {
        p.isFavorite = !p.isFavorite;
        // Also update child projects
        getChildProjects(id).forEach(child => {
            child.isFavorite = p.isFavorite;
        });
        commitState();
    }
}

export function setCategory(id, category, e) {
    e.stopPropagation();
    const p = state.projects.find(x => x.id === id);
    if (p) {
        const oldCategory = p.category;
        p.category = category;
        if (category === 'archive') {
            p.isFavorite = false;
            p.color = ARCHIVE_COLOR;
        } else if (oldCategory === 'archive' && category === 'active') {
            p.color = getDistinctColor();
        }
        // Also update child projects
        getChildProjects(id).forEach(child => {
            child.category = category;
            if (category === 'archive') {
                child.isFavorite = false;
                child.color = ARCHIVE_COLOR;
            } else if (oldCategory === 'archive' && category === 'active') {
                child.color = p.color; // Inherit parent's new color
            }
        });
        commitState();
    }
}

export async function deleteProject(id, e) {
    e.stopPropagation();
    const p = state.projects.find(x => x.id === id);
    const children = getChildProjects(id);
    const name = p ? p.name : '';
    const msg = children.length > 0
        ? `„${name}" und ${children.length} Unterprojekt${children.length > 1 ? 'e' : ''} werden unwiderruflich gelöscht.`
        : `„${name}" wird unwiderruflich gelöscht.`;
    const ok = await showConfirm(msg, { title: 'Projekt löschen?', icon: 'delete', okText: 'Löschen', danger: true });
    if (!ok) return;
    // Undo: snapshot before delete
    const deletedProjects = state.projects.filter(x => x.id === id || x.parentId === id);
    pushUndo({ type: 'deleteProject', data: JSON.parse(JSON.stringify(deletedProjects)), timestamp: Date.now(), label: `Projekt "${name}" gelöscht` });
    // Delete project and all its children
    state.projects = state.projects.filter(p => p.id !== id && p.parentId !== id);
    commitState();
    showUndoToast(`Projekt "${name}" gelöscht`);
}

// --- PROJEKT BEARBEITEN ---

export function openProjectEdit(projectId, e) {
    if (e) e.stopPropagation();
    const p = state.projects.find(x => x.id === projectId);
    if (!p) return;
    uiState.editingProjectId = projectId;
    document.getElementById('editProjectNum').value = p.number || '';
    document.getElementById('editProjectName').value = p.name || '';
    document.getElementById('editProjectBudget').value = p.budgetHours != null ? p.budgetHours : '';
    document.getElementById('projectEditModal').classList.add('open');
}

export function saveProjectEdit() {
    if (!uiState.editingProjectId) return;
    const p = state.projects.find(x => x.id === uiState.editingProjectId);
    if (!p) return;
    const num = document.getElementById('editProjectNum').value.trim();
    const name = document.getElementById('editProjectName').value.trim();
    const budgetRaw = document.getElementById('editProjectBudget').value.trim();
    if (!name) return;
    p.number = num || p.number;
    p.name = name;
    p.budgetHours = budgetRaw !== '' ? parseFloat(budgetRaw) : null;
    persistState();
    document.getElementById('projectEditModal').classList.remove('open');
    uiState.editingProjectId = null;
    notifyStateChanged();
}

// --- SUB-PROJEKTE ---

export function openSubProjectModal(parentId, e) {
    if (e) e.stopPropagation();
    const parent = state.projects.find(x => x.id === parentId);
    if (!parent) return;
    uiState.editingProjectId = parentId;
    document.getElementById('subProjectParentTitle').innerText = `Übergeordnet: ${parent.number || ''} ${parent.name}`;
    document.getElementById('subProjectName').value = '';
    document.getElementById('subProjectModal').classList.add('open');
    setTimeout(() => document.getElementById('subProjectName').focus(), 100);
}

export function saveSubProject() {
    if (!uiState.editingProjectId) return;
    const parent = state.projects.find(x => x.id === uiState.editingProjectId);
    if (!parent) return;
    const name = document.getElementById('subProjectName').value.trim();
    if (!name) return;

    const subProject = {
        id: crypto.randomUUID(),
        number: parent.number || '-',
        name: name,
        category: parent.category,
        isFavorite: parent.isFavorite,
        color: parent.color,
        status: 'stopped',
        logs: [],
        tagIds: [],
        parentId: parent.id,
        dailyNotes: {}
    };

    // Insert sub-project right after parent (and any existing sub-projects of this parent)
    const parentIdx = state.projects.indexOf(parent);
    let insertIdx = parentIdx + 1;
    while (insertIdx < state.projects.length && state.projects[insertIdx].parentId === parent.id) {
        insertIdx++;
    }
    state.projects.splice(insertIdx, 0, subProject);

    persistState();
    document.getElementById('subProjectModal').classList.remove('open');
    uiState.editingProjectId = null;
    notifyStateChanged();
}

// --- HILFSFUNKTIONEN ---

export function getChildProjects(parentId) {
    return state.projects.filter(p => p.parentId === parentId);
}

export function isParentProject(projectId) {
    return state.projects.some(p => p.parentId === projectId);
}

export function calculateProjectTotalMs(project) {
    // Summe aller Logs über die gesamte Projektlaufzeit (ohne Pausenabzug, da historisch)
    const now = Date.now();
    return (project.logs || []).reduce((sum, log) => {
        return sum + Math.max(0, (log.end || now) - log.start);
    }, 0);
}
