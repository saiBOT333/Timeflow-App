import { APP_VERSION, CHANGELOG } from './config.js';

// --- ONBOARDING ---
let onboardingStep = 0;
const onboardingSteps = [
    { icon: 'waving_hand', title: 'Willkommen bei TimeFlow!', text: 'TimeFlow erfasst deine Arbeitszeit automatisch. Das Projekt \u00ABAllgemein\u00BB l\u00E4uft bereits.', btn: 'Weiter' },
    { icon: 'add_circle', title: 'Projekte anlegen', text: 'Lege oben neue Projekte an. Klicke auf ein Projekt um es zu starten. Das aktive Projekt wird im Aktivit\u00E4tsbereich angezeigt.', btn: 'Weiter' },
    { icon: 'tune', title: 'Alles konfigurierbar', text: 'In den Einstellungen kannst du Pausen, Erinnerungen, Links und vieles mehr anpassen. Viel Spa\u00DF!', btn: 'Los geht\u2019s' }
];

function updateOnboardingUI() {
    const step = onboardingSteps[onboardingStep];
    document.getElementById('onboardingIcon').textContent = step.icon;
    document.getElementById('onboardingTitle').textContent = step.title;
    document.getElementById('onboardingText').textContent = step.text;
    document.getElementById('onboardingBtn').textContent = step.btn;
    for (let i = 0; i < 3; i++) {
        document.getElementById('onbDot' + i).classList.toggle('active', i === onboardingStep);
    }
}

export function showOnboarding() {
    onboardingStep = 0;
    updateOnboardingUI();
    document.getElementById('onboardingOverlay').classList.remove('hidden');
}

function advanceOnboarding() {
    onboardingStep++;
    if (onboardingStep >= onboardingSteps.length) {
        localStorage.setItem('tf_onboarded', 'true');
        document.getElementById('onboardingOverlay').classList.add('hidden');
        return;
    }
    updateOnboardingUI();
}

window.advanceOnboarding = advanceOnboarding;

// --- CHANGELOG ---
function showChangelogModal(entry) {
    document.getElementById('changelogTitle').textContent = entry.title;
    document.getElementById('changelogSubtitle').textContent = entry.subtitle || '';
    const list = document.getElementById('changelogList');
    list.innerHTML = entry.changes.map(c =>
        `<div style="display:flex; align-items:flex-start; gap:12px;">
            <span class="material-symbols-rounded fs-20 text-primary" style="flex-shrink:0; margin-top:1px;">${c.icon}</span>
            <span class="fs-14-variant" style="line-height:1.5;">${c.text}</span>
        </div>`
    ).join('');
    document.getElementById('changelogModal').classList.add('open');
}

export function checkAndShowChangelog() {
    const lastSeen = localStorage.getItem('tf_version_seen');
    if (lastSeen === APP_VERSION) return;
    const entry = CHANGELOG[APP_VERSION];
    if (!entry) {
        localStorage.setItem('tf_version_seen', APP_VERSION);
        return;
    }
    showChangelogModal(entry);
}

function dismissChangelog() {
    localStorage.setItem('tf_version_seen', APP_VERSION);
    document.getElementById('changelogModal').classList.remove('open');
}

window.dismissChangelog = dismissChangelog;
