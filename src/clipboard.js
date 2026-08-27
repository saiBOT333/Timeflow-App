// =============================================================================
// clipboard.js – Text in die Zwischenablage kopieren
// =============================================================================
// navigator.clipboard gibt es nur in sicheren Kontexten (https oder
// localhost). Wird TimeFlow über file:// oder per http im Firmennetz
// geöffnet, fehlt die API – dafür der Fallback über ein unsichtbares
// Textfeld und document.execCommand('copy').
// =============================================================================

/**
 * @param {string} text
 * @returns {Promise<boolean>} true, wenn kopiert wurde
 */
export async function copyText(text) {
    const value = String(text == null ? '' : text);
    if (!value) return false;

    try {
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(value);
            return true;
        }
    } catch (e) {
        // z. B. NotAllowedError ohne Nutzergeste → unten weiterversuchen
    }
    return copyViaTextarea(value);
}

function copyViaTextarea(value) {
    if (typeof document === 'undefined' || !document.body) return false;

    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);

    // Bestehende Textmarkierung des Nutzers nicht zerstören
    const selection = typeof document.getSelection === 'function' ? document.getSelection() : null;
    const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    let ok = false;
    try {
        ta.select();
        ok = document.execCommand('copy');
    } catch (e) {
        ok = false;
    }

    ta.remove();
    if (selection && previousRange) {
        selection.removeAllRanges();
        selection.addRange(previousRange);
    }
    return ok;
}
