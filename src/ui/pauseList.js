import { state, uiState } from '../state.js';
import { formatTimeInput } from '../utils.js';
import { deletePause, updatePauseTime } from '../pauses.js';

// =============================================================================
// ui/pauseList.js – Manuelle Pausen-Liste rendern
// =============================================================================

export function renderPauses() {
    const el = document.getElementById('pauseList');
    el.innerHTML = '';
    const relevantPauses = state.pauses.filter(p => {
        const pDate = new Date(p.startTs).toISOString().split('T')[0];
        if (pDate !== uiState.viewDate) return false;
        // Nur manuelle Pausen — Auto-Pausen werden über das Config-Panel verwaltet
        if (p.type === 'auto') return false;
        return true;
    });
    relevantPauses.sort((a, b) => b.startTs - a.startTs);

    relevantPauses.forEach(p => {
        const startStr = formatTimeInput(p.startTs);
        const endStr = p.endTs ? formatTimeInput(p.endTs) : '';

        const div = document.createElement('div');
        div.className = 'pause-config-item';

        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
                <span class="material-symbols-rounded fs-18 text-secondary">
                    ${p.type === 'auto' ? 'smart_toy' : 'coffee'}
                </span>
                <span class="fs-14">${p.label}</span>
            </div>
            <div style="display:flex; align-items:center; gap:4px;">
                <input type="text" value="${startStr}" onchange="updatePauseTime('${p.id}', 'start', this.value)"
                    style="background:transparent; border:none; width:44px; text-align:center; color:var(--md-sys-color-on-surface); font-family:monospace;">
                <span class="op-50">-</span>
                <input type="text" value="${endStr}" ${p.active ? 'disabled' : ''} onchange="updatePauseTime('${p.id}', 'end', this.value)"
                    style="background:transparent; border:none; width:44px; text-align:center; color:var(--md-sys-color-on-surface); font-family:monospace;">

                <button class="icon-btn icon-btn-24 text-error" style="margin-left:8px;"
                    onclick="deletePause('${p.id}')" title="Pause löschen">
                    <span class="material-symbols-rounded fs-18">delete</span>
                </button>
            </div>
        `;
        el.appendChild(div);
    });
}

// onclick-Handler für inline HTML verfügbar machen
window.deletePause = deletePause;
window.updatePauseTime = updatePauseTime;
