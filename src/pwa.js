// =============================================================================
// pwa.js – Progressive Web App Setup
// =============================================================================
// setupPWA()        – Service Worker registrieren, Update-Listener einrichten
// showUpdateToast() – Toast bei verfügbarem SW-Update anzeigen
// =============================================================================

export function showUpdateToast() {
    if (document.getElementById('update-toast')) return;
    const toast = document.createElement('div');
    toast.id = 'update-toast';
    toast.className = 'update-toast';
    toast.innerHTML = `
        <span class="material-symbols-rounded fs-20 text-primary" style="flex-shrink:0;">new_releases</span>
        <span style="flex:1;">Neue Version verfügbar</span>
        <button class="text-btn fw-600 text-primary" style="white-space:nowrap;" onclick="window.location.reload()">Aktualisieren</button>
        <button class="icon-btn" title="Schließen" onclick="document.getElementById('update-toast').remove()">
            <span class="material-symbols-rounded fs-18">close</span>
        </button>`;
    document.body.appendChild(toast);
}

export function setupPWA() {
    // Service Worker registrieren (nur unter HTTP/HTTPS möglich)
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            console.info('[PWA] Service Worker registriert:', reg.scope);
            // Bei jedem App-Start sofort auf neue SW-Version prüfen (umgeht 24h-HTTP-Cache)
            reg.update();
            // Neu installierter SW wartet auf Aktivierung → skipWaiting auslösen
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (!newWorker) return;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Neuer SW ist bereit – sofort übernehmen
                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                    }
                });
            });
        }).catch(err => {
            console.warn('[PWA] Service Worker Registrierung fehlgeschlagen:', err.message);
        });
        // Wenn ein neuer SW die Kontrolle übernimmt → Update-Toast anzeigen
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            showUpdateToast();
        });
    } else if (location.protocol === 'file:') {
        console.info('[PWA] file://-Protokoll erkannt. Für vollständige PWA-Unterstützung per HTTP starten:');
        console.info('  → npm run dev   (Vite Dev-Server mit HMR)');
        console.info('  → Dann http://localhost:5500/index.html öffnen');
        console.info('  → Alternativ: Chrome/Edge ⋮ → Verknüpfung erstellen → Als Fenster öffnen');
    }

    // Install-Prompt für "Zur Startseite hinzufügen" abfangen
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        window.deferredPWAPrompt = e;
    });
}
