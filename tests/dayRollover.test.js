// @vitest-environment jsdom
// =============================================================================
// dayRollover.test.js – Tests für Tagesgrenze, Heartbeat und Hinweistext
// =============================================================================
import { describe, test, expect, beforeEach } from 'vitest';
import { state } from '../src/state.js';
import {
    closeOpenDays,
    resolveCloseTs,
    startOfLocalDay,
    readHeartbeat,
    writeHeartbeat,
    formatRolloverMessage,
    HEARTBEAT_INTERVAL_MS,
} from '../src/dayRollover.js';

// Feste Bezugspunkte in LOKALER Zeit (die App rechnet durchgehend lokal).
const TODAY_9H = new Date(2026, 7, 27, 9, 0, 0).getTime();       // Do, 27.08.2026 09:00
const YESTERDAY_8H = new Date(2026, 7, 26, 8, 0, 0).getTime();   // Mi, 26.08.2026 08:00
const YESTERDAY_1732 = new Date(2026, 7, 26, 17, 32, 0).getTime();
const YESTERDAY_END = new Date(2026, 7, 26, 23, 59, 59).getTime();

function project(over = {}) {
    return { id: 'p1', name: 'Projekt A', status: 'stopped', logs: [], ...over };
}

function resetState() {
    state.projects = [];
    state.pauses = [];
    state.manualPauseActive = false;
    localStorage.clear();
}

beforeEach(resetState);

describe('startOfLocalDay / resolveCloseTs', () => {
    test('startOfLocalDay liefert Mitternacht des lokalen Tages', () => {
        const d = new Date(startOfLocalDay(YESTERDAY_1732));
        expect(d.getFullYear()).toBe(2026);
        expect(d.getMonth()).toBe(7);
        expect(d.getDate()).toBe(26);
        expect(d.getHours()).toBe(0);
        expect(d.getMinutes()).toBe(0);
    });

    test('Heartbeat vom selben Tag wird als Endzeit übernommen', () => {
        expect(resolveCloseTs(YESTERDAY_8H, YESTERDAY_1732)).toEqual({
            ts: YESTERDAY_1732,
            estimated: false,
        });
    });

    test('Heartbeat aus der Folgenacht wird auf 23:59:59 gekappt', () => {
        const afterMidnight = new Date(2026, 7, 27, 0, 30, 0).getTime();
        expect(resolveCloseTs(YESTERDAY_8H, afterMidnight)).toEqual({
            ts: YESTERDAY_END,
            estimated: true,
        });
    });

    test('ohne Heartbeat wird auf 23:59:59 geschätzt', () => {
        expect(resolveCloseTs(YESTERDAY_8H, null)).toEqual({ ts: YESTERDAY_END, estimated: true });
    });

    test('Heartbeat vor dem Log-Start ist unbrauchbar → Schätzung', () => {
        const before = new Date(2026, 7, 26, 7, 0, 0).getTime();
        expect(resolveCloseTs(YESTERDAY_8H, before)).toEqual({ ts: YESTERDAY_END, estimated: true });
    });
});

describe('closeOpenDays', () => {
    test('offener Log von gestern wird auf den letzten Heartbeat beendet', () => {
        state.projects = [project({ status: 'running', logs: [{ start: YESTERDAY_8H, end: null }] })];

        const report = closeOpenDays(TODAY_9H, YESTERDAY_1732);

        expect(state.projects[0].logs[0].end).toBe(YESTERDAY_1732);
        expect(state.projects[0].status).toBe('stopped');
        expect(report.date).toBe('2026-08-26');
        expect(report.estimated).toBe(false);
        expect(report.entries).toEqual([
            { projectId: 'p1', projectName: 'Projekt A', start: YESTERDAY_8H, end: YESTERDAY_1732, estimated: false },
        ]);
    });

    test('ohne Heartbeat wird auf 23:59:59 geschlossen und als geschätzt markiert', () => {
        state.projects = [project({ status: 'running', logs: [{ start: YESTERDAY_8H, end: null }] })];

        const report = closeOpenDays(TODAY_9H, null);

        expect(state.projects[0].logs[0].end).toBe(YESTERDAY_END);
        expect(report.estimated).toBe(true);
    });

    test('Logs von heute bleiben unangetastet (Reload darf nicht abschneiden)', () => {
        const todayStart = new Date(2026, 7, 27, 7, 30, 0).getTime();
        state.projects = [project({ status: 'running', logs: [{ start: todayStart, end: null }] })];

        expect(closeOpenDays(TODAY_9H, todayStart + 60000)).toBeNull();
        expect(state.projects[0].logs[0].end).toBeNull();
        expect(state.projects[0].status).toBe('running');
    });

    test('bereits geschlossene Logs bleiben unverändert', () => {
        state.projects = [project({ logs: [{ start: YESTERDAY_8H, end: YESTERDAY_1732 }] })];

        expect(closeOpenDays(TODAY_9H, YESTERDAY_1732)).toBeNull();
        expect(state.projects[0].logs[0].end).toBe(YESTERDAY_1732);
    });

    test('mehrere offene Logs über mehrere Tage werden alle geschlossen', () => {
        const twoDaysAgo = new Date(2026, 7, 25, 9, 0, 0).getTime();
        state.projects = [
            project({ id: 'p1', name: 'A', status: 'running', logs: [{ start: YESTERDAY_8H, end: null }] }),
            project({ id: 'p2', name: 'B', status: 'running', logs: [{ start: twoDaysAgo, end: null }] }),
        ];

        const report = closeOpenDays(TODAY_9H, YESTERDAY_1732);

        expect(report.entries).toHaveLength(2);
        expect(report.dates).toEqual(['2026-08-25', '2026-08-26']);
        expect(report.date).toBe('2026-08-26');
        // p2 startete vorgestern – der Heartbeat von gestern taugt nicht als Endzeit
        expect(state.projects[1].logs[0].end).toBe(new Date(2026, 7, 25, 23, 59, 59).getTime());
        expect(state.projects.every(p => p.status === 'stopped')).toBe(true);
    });

    test('aktive Pause von gestern wird beendet und manualPauseActive zurückgesetzt', () => {
        state.pauses = [{ id: 'x', startTs: new Date(2026, 7, 26, 12, 0, 0).getTime(), endTs: null, type: 'manual', active: true }];
        state.manualPauseActive = true;

        const report = closeOpenDays(TODAY_9H, YESTERDAY_1732);

        expect(state.pauses[0].active).toBe(false);
        expect(state.pauses[0].endTs).toBe(YESTERDAY_1732);
        expect(state.manualPauseActive).toBe(false);
        expect(report.pauseCount).toBe(1);
        expect(report.entries).toEqual([]);
    });

    test('laufende Pause von heute bleibt aktiv', () => {
        state.pauses = [{ id: 'x', startTs: new Date(2026, 7, 27, 8, 0, 0).getTime(), endTs: null, type: 'manual', active: true }];
        state.manualPauseActive = true;

        expect(closeOpenDays(TODAY_9H, null)).toBeNull();
        expect(state.pauses[0].active).toBe(true);
        expect(state.manualPauseActive).toBe(true);
    });

    test('Projekt mit weiterem offenen Log von heute bleibt running', () => {
        const todayStart = new Date(2026, 7, 27, 8, 0, 0).getTime();
        state.projects = [project({
            status: 'running',
            logs: [{ start: YESTERDAY_8H, end: null }, { start: todayStart, end: null }],
        })];

        closeOpenDays(TODAY_9H, YESTERDAY_1732);

        expect(state.projects[0].logs[0].end).toBe(YESTERDAY_1732);
        expect(state.projects[0].logs[1].end).toBeNull();
        expect(state.projects[0].status).toBe('running');
    });

    test('leerer State ergibt keinen Report', () => {
        expect(closeOpenDays(TODAY_9H, YESTERDAY_1732)).toBeNull();
    });
});

describe('Heartbeat', () => {
    test('schreibt und liest den Zeitstempel', () => {
        writeHeartbeat(TODAY_9H, { force: true });
        expect(readHeartbeat()).toBe(TODAY_9H);
    });

    test('ohne Eintrag ist der Heartbeat null', () => {
        expect(readHeartbeat()).toBeNull();
    });

    test('Schreibvorgänge innerhalb des Intervalls werden gedrosselt', () => {
        writeHeartbeat(TODAY_9H, { force: true });
        writeHeartbeat(TODAY_9H + HEARTBEAT_INTERVAL_MS - 1000);
        expect(readHeartbeat()).toBe(TODAY_9H);

        writeHeartbeat(TODAY_9H + HEARTBEAT_INTERVAL_MS + 1000);
        expect(readHeartbeat()).toBe(TODAY_9H + HEARTBEAT_INTERVAL_MS + 1000);
    });
});

describe('formatRolloverMessage', () => {
    test('nennt Projekt, Endzeit und den Neustart des Tages', () => {
        state.projects = [project({ status: 'running', logs: [{ start: YESTERDAY_8H, end: null }] })];
        const msg = formatRolloverMessage(closeOpenDays(TODAY_9H, YESTERDAY_1732));

        expect(msg).toContain('Projekt A');
        expect(msg).toContain('17:32');
        expect(msg).toContain('kein Feierabend gebucht');
        expect(msg).toContain('Heute startet die Zeiterfassung wieder bei 0.');
        expect(msg).not.toContain('bitte im Stundenzettel prüfen');
    });

    test('geschätzte Endzeit fordert zum Prüfen auf', () => {
        state.projects = [project({ status: 'running', logs: [{ start: YESTERDAY_8H, end: null }] })];
        const msg = formatRolloverMessage(closeOpenDays(TODAY_9H, null));

        expect(msg).toContain('bitte im Stundenzettel prüfen');
    });

    test('Mitternachtsvariante spricht nicht von einem Neustart', () => {
        state.projects = [project({ status: 'running', logs: [{ start: YESTERDAY_8H, end: null }] })];
        const msg = formatRolloverMessage(closeOpenDays(TODAY_9H, YESTERDAY_1732), { restarted: false });

        expect(msg).toContain('Der Tag ist abgeschlossen');
        expect(msg).not.toContain('wieder bei 0');
    });

    test('mehrere Aktivitäten werden aufgelistet', () => {
        state.projects = [
            project({ id: 'p1', name: 'A', status: 'running', logs: [{ start: YESTERDAY_8H, end: null }] }),
            project({ id: 'p2', name: 'B', status: 'running', logs: [{ start: YESTERDAY_8H, end: null }] }),
        ];
        const msg = formatRolloverMessage(closeOpenDays(TODAY_9H, YESTERDAY_1732));

        expect(msg).toContain('„A"');
        expect(msg).toContain('„B"');
    });

    test('beendete Pause wird erwähnt', () => {
        state.pauses = [{ id: 'x', startTs: new Date(2026, 7, 26, 12, 0, 0).getTime(), endTs: null, type: 'manual', active: true }];
        state.manualPauseActive = true;
        const msg = formatRolloverMessage(closeOpenDays(TODAY_9H, YESTERDAY_1732));

        expect(msg).toContain('Eine laufende Pause wurde ebenfalls beendet.');
    });
});
