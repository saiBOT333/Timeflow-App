// =============================================================================
// utils.js – Reine Hilfsfunktionen (keine externen Abhängigkeiten)
// =============================================================================
// Alle Funktionen hier sind "pure": gleiche Eingabe → gleiche Ausgabe,
// keine Seiteneffekte, kein Zugriff auf state, DOM oder andere Module.
// =============================================================================

// --- ZEITFORMATIERUNG ---

/**
 * Millisekunden → "HH:MM" oder "HH:MM:SS"
 * @param {number} ms
 * @param {boolean} includeSeconds
 */
export function formatMs(ms, includeSeconds = true) {
    const s = Math.floor((ms / 1000) % 60);
    const m = Math.floor((ms / (1000 * 60)) % 60);
    const h = Math.floor((ms / (1000 * 60 * 60)));
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}${includeSeconds ? ':' + pad(s) : ''}`;
}

/**
 * Millisekunden → Dezimalformat "h,hh" (z.B. 5400000 → "1,50")
 * Wird in der Wochenübersicht verwendet, wenn uiState.weeklyDecimal aktiv ist.
 */
export function formatMsDecimal(ms) {
    const hours = ms / 3600000;
    return hours.toFixed(2).replace('.', ',');
}

/**
 * Timestamp (ms) → "HH:MM" Uhrzeit-String
 */
export function formatTimeInput(ts) {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

/**
 * "HH:MM"-String um N Minuten erhöhen (wraps bei 24h)
 */
export function incrementTime(hhmm, minutes) {
    const [h, m] = hhmm.split(':').map(Number);
    const total = h * 60 + m + minutes;
    return (Math.floor(total / 60) % 24).toString().padStart(2, '0') + ':' + (total % 60).toString().padStart(2, '0');
}

/**
 * Prüft ob zwei Date-Objekte am selben Kalendertag liegen
 */
export function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

// --- FARB-UTILITIES ---

/**
 * Hex-Farbe + Alpha → "rgba(r, g, b, alpha)"-String
 */
export function hexToRgba(hex, alpha) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Dynamische Kontrastberechnung (WCAG) – gibt #1C1B1F (dunkel) oder #FFFBFE (hell)
 * zurück, je nachdem ob der Hintergrund hell oder dunkel ist.
 */
export function getContrastTextColor(hexColor) {
    if (!hexColor || hexColor.startsWith('var(')) return '#FFFBFE';
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const toLinear = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    return luminance > 0.5 ? '#1C1B1F' : '#FFFBFE';
}

// --- HTML/STRING ---

/**
 * HTML-Sonderzeichen escapen (verhindert XSS in innerHTML)
 */
export function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
