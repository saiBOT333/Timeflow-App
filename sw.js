/**
 * TimeFlow Service Worker
 * Strategie:
 *   - Core-Assets (index.html, style.css, app.js):  Stale-While-Revalidate
 *     → App startet sofort aus dem Cache; im Hintergrund wird auf neue Version geprüft.
 *   - Externe Ressourcen (Google Fonts, Icons):      Cache-First mit Netzwerk-Fallback
 *   - Alles andere:                                  Network-First mit Cache-Fallback
 */

const CACHE_VERSION = 'timeflow-v3.2.0';

// Core-Assets die immer gecacht werden (relativ zur SW-Scope-URL)
const CORE_ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js'
];

// Externe Hosts die Cache-First behandelt werden (Fonts, Icons)
const CACHE_FIRST_HOSTS = [
    'fonts.googleapis.com',
    'fonts.gstatic.com'
];

// ── Install ──────────────────────────────────────────────────────────────────
// Precache Core-Assets; skipWaiting() sorgt dafür dass der neue SW sofort aktiv wird.
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then(cache => {
            return cache.addAll(CORE_ASSETS).catch(err => {
                // Einzelne Fehler (z.B. bei file://) nicht den ganzen Install abbrechen lassen
                console.warn('[SW] Precache teilweise fehlgeschlagen:', err);
            });
        })
    );
    self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────
// Alle veralteten Cache-Versionen aufräumen; Clients sofort übernehmen.
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_VERSION)
                    .map(key => {
                        console.info('[SW] Alter Cache gelöscht:', key);
                        return caches.delete(key);
                    })
            )
        ).then(() => self.clients.claim())
    );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Nur GET-Requests cachen
    if (event.request.method !== 'GET') return;

    // Chrome-Extensions und andere Nicht-HTTP-Protokolle ignorieren
    if (!url.protocol.startsWith('http')) return;

    if (isCoreAsset(url)) {
        // Stale-While-Revalidate für Core-Assets
        event.respondWith(staleWhileRevalidate(event.request));
    } else if (isCacheFirstHost(url)) {
        // Cache-First für externe Fonts/Icons
        event.respondWith(cacheFirst(event.request));
    } else {
        // Network-First für alles andere (API-Calls, dynamische Ressourcen)
        event.respondWith(networkFirst(event.request));
    }
});

// ── Strategien ───────────────────────────────────────────────────────────────

/**
 * Stale-While-Revalidate:
 * Antwortet sofort mit gecachter Version (falls vorhanden), aktualisiert Cache im Hintergrund.
 */
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(request);

    // Im Hintergrund revalidieren (nicht abwarten)
    const fetchPromise = fetch(request).then(response => {
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    }).catch(() => null);

    return cached || await fetchPromise || offlineFallback();
}

/**
 * Cache-First:
 * Cache-Treffer sofort zurückgeben; nur bei Miss Netzwerk nutzen und cachen.
 */
async function cacheFirst(request) {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return offlineFallback();
    }
}

/**
 * Network-First:
 * Netzwerk bevorzugen; bei Fehler auf Cache zurückfallen.
 */
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_VERSION);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        return cached || offlineFallback();
    }
}

/**
 * Minimale Offline-Antwort wenn weder Cache noch Netzwerk verfügbar sind.
 */
function offlineFallback() {
    return new Response(
        '<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#111318;color:#A8C7FA;">' +
        '<div style="text-align:center;"><h2>TimeFlow</h2><p>Offline – bitte Verbindung prüfen.</p></div></body></html>',
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
}

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

function isCoreAsset(url) {
    const path = url.pathname;
    return (
        path.endsWith('/') ||
        path.endsWith('/index.html') ||
        path.endsWith('/style.css') ||
        path.endsWith('/app.js')
    );
}

function isCacheFirstHost(url) {
    return CACHE_FIRST_HOSTS.some(host => url.hostname.includes(host));
}
