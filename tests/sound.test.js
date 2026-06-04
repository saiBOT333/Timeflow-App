// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Minimaler Web-Audio-Mock ---------------------------------------------
function makeAudioMock() {
    const created = { oscillators: 0, gains: 0 };
    class FakeParam {
        constructor() { this.value = 0; }
        setValueAtTime() { return this; }
        linearRampToValueAtTime() { return this; }
    }
    class FakeOsc {
        constructor() { this.frequency = new FakeParam(); this.type = ''; }
        connect() {}
        start() {}
        stop() {}
    }
    class FakeGain {
        constructor() { this.gain = new FakeParam(); }
        connect() {}
    }
    class FakeCtx {
        constructor() { this.currentTime = 0; this.destination = {}; this.state = 'running'; }
        createOscillator() { created.oscillators++; return new FakeOsc(); }
        createGain() { created.gains++; return new FakeGain(); }
        resume() {}
    }
    return { FakeCtx, created };
}

describe('playReminderSound', () => {
    let restore;
    beforeEach(() => {
        // Dynamischer Import + resetModules: setzt den modul-internen audioCtx-Singleton pro Test zurück
        vi.resetModules();
        restore = { AudioContext: globalThis.AudioContext, webkit: globalThis.webkitAudioContext };
    });
    afterEach(() => {
        globalThis.AudioContext = restore.AudioContext;
        globalThis.webkitAudioContext = restore.webkit;
        vi.restoreAllMocks();
    });

    it('erzeugt zwei Oszillatoren (Doppel-Piep)', async () => {
        const { FakeCtx, created } = makeAudioMock();
        globalThis.AudioContext = FakeCtx;
        const { playReminderSound } = await import('../src/sound.js');
        playReminderSound();
        expect(created.oscillators).toBe(2);
        expect(created.gains).toBe(2);
    });

    it('wirft nicht, wenn keine Web Audio API vorhanden ist', async () => {
        globalThis.AudioContext = undefined;
        globalThis.webkitAudioContext = undefined;
        const { playReminderSound } = await import('../src/sound.js');
        expect(() => playReminderSound()).not.toThrow();
    });

    it('fängt Fehler still ab und warnt (kein Throw)', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        globalThis.AudioContext = class { constructor() { throw new Error('boom'); } };
        const { playReminderSound } = await import('../src/sound.js');
        expect(() => playReminderSound()).not.toThrow();
        expect(warn).toHaveBeenCalled();
    });
});
