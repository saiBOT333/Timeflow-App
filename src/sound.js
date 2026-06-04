// =============================================================================
// sound.js – Synthetischer Signalton (Web Audio API)
// =============================================================================
// Zustandslos bzgl. App-State. Erzeugt einen kurzen Doppel-Piep ohne Asset.
// Fehler (kein Web-Audio-Support o.Ä.) werden still abgefangen – nie ein Crash.
// =============================================================================

let audioCtx = null;

function playBeep(ctx, startBase, offset) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    const t = startBase + offset;
    // Sanfte Hüllkurve gegen Knacken
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.01);
    gain.gain.linearRampToValueAtTime(0, t + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.13);
}

export function playReminderSound() {
    try {
        const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Ctx) return;
        if (!audioCtx) audioCtx = new Ctx();
        const ctx = audioCtx;
        // Browser starten den Context teils suspendiert.
        // resume() ist async und wird bewusst nicht awaited – beim allerersten Ton einer Session
        // kann die Hüllkurve minimal abgeschnitten sein (akzeptiert, kein Crash).
        if (ctx.state === 'suspended' && typeof ctx.resume === 'function') ctx.resume();
        const now = ctx.currentTime;
        playBeep(ctx, now, 0.0);   // Piep 1
        playBeep(ctx, now, 0.18);  // Piep 2 nach kurzer Pause
    } catch (err) {
        console.warn('playReminderSound failed:', err);
    }
}
