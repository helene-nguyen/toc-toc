import { describe, expect, it } from 'vitest';
import {
  accountChanged,
  contractionTapped,
  initialMonitoringState,
  curveChanged,
  curveChosen,
  painChanged,
  painChosen,
  lastTapUndone,
  liveDiscarded,
  liveForgotten,
  liveResumed,
  monitoringReducer,
  monitoringStarted,
  monitoringStopped,
  movementTapped,
  practiceRemoved,
  practiceTapped,
  requestRejected,
  requestSent,
  type MonitoringState
} from './monitoringSlice';

// 20:mm:ss on 2026-10-29, UTC
const at = (minutes: number) => new Date(Date.UTC(2026, 9, 29, 20, 0, 0) + minutes * 60_000).toISOString();

const play = (...actions: Parameters<typeof monitoringReducer>[1][]): MonitoringState =>
  actions.reduce(monitoringReducer, initialMonitoringState);

const kinds = (state: MonitoringState) => state.outbox.map((request) => request.kind);

describe('monitoringSlice', () => {
  it('starts a monitoring locally and queues its start', () => {
    const state = play(monitoringStarted({ id: 'm1', at: at(0) }));

    expect(state.live).toEqual({ id: 'm1', startedAt: at(0), stoppedAt: null, contractions: [], movements: [] });
    expect(state.outbox).toEqual([{ seq: 1, kind: 'start', id: 'm1', startedAt: at(0) }]);
  });

  it('starts then ends a contraction with the same button, queuing only its latest state', () => {
    const state = play(
      monitoringStarted({ id: 'm1', at: at(0) }),
      contractionTapped({ id: 'c1', at: at(5) }),
      contractionTapped({ id: 'ignored', at: at(6) })
    );

    expect(state.live?.contractions).toEqual([
      { id: 'c1', startedAt: at(5), endedAt: at(6), intensity: 2, braxtonHicks: false, curve: 'auto' }
    ]);
    expect(kinds(state)).toEqual(['start', 'saveContraction']);
  });

  it('sets the intensity of the last contraction', () => {
    const state = play(
      monitoringStarted({ id: 'm1', at: at(0) }),
      contractionTapped({ id: 'c1', at: at(5) }),
      contractionTapped({ id: 'x', at: at(6) }),
      painChosen(3)
    );

    expect(state.live?.contractions[0].intensity).toBe(3);
    expect(state.outbox.at(-1)).toMatchObject({ kind: 'saveContraction', contraction: { id: 'c1', intensity: 3 } });
  });

  it('changes the intensity of any contraction afterwards, even once stopped', () => {
    const state = play(
      monitoringStarted({ id: 'm1', at: at(0) }),
      contractionTapped({ id: 'c1', at: at(5) }),
      contractionTapped({ id: 'x', at: at(6) }),
      contractionTapped({ id: 'c2', at: at(10) }),
      contractionTapped({ id: 'x', at: at(11) }),
      monitoringStopped({ id: 'x', at: at(20) }),
      painChanged({ contractionId: 'c1', pain: 1 })
    );

    expect(state.live?.contractions.map((contraction) => contraction.intensity)).toEqual([1, 2]);
    expect(state.outbox.at(-1)).toMatchObject({ kind: 'saveContraction', contraction: { id: 'c1', intensity: 1 } });
  });

  it('marks a contraction painless (Braxton-Hicks), keeping its intensity in case it changes back', () => {
    const marked = play(
      monitoringStarted({ id: 'm1', at: at(0) }),
      contractionTapped({ id: 'c1', at: at(5) }),
      contractionTapped({ id: 'x', at: at(6) }),
      painChosen(3),
      painChosen('none')
    );
    const back = monitoringReducer(marked, painChanged({ contractionId: 'c1', pain: 2 }));

    expect(marked.live?.contractions[0]).toMatchObject({ intensity: 3, braxtonHicks: true });
    expect(marked.outbox.at(-1)).toMatchObject({ contraction: { id: 'c1', braxtonHicks: true } });
    expect(back.live?.contractions[0]).toMatchObject({ intensity: 2, braxtonHicks: false });
  });

  it('sets the intensity drawn on the trace apart from the pain, now or afterwards', () => {
    const state = play(
      monitoringStarted({ id: 'm1', at: at(0) }),
      contractionTapped({ id: 'c1', at: at(5) }),
      contractionTapped({ id: 'x', at: at(6) }),
      painChosen(3),
      curveChosen('low')
    );
    const changed = monitoringReducer(state, curveChanged({ contractionId: 'c1', curve: 'high' }));

    expect(state.live?.contractions[0]).toMatchObject({ intensity: 3, braxtonHicks: false, curve: 'low' });
    expect(changed.live?.contractions[0].curve).toBe('high');
    expect(changed.outbox.at(-1)).toMatchObject({ kind: 'saveContraction', contraction: { id: 'c1', curve: 'high' } });
  });

  it('records movements', () => {
    const state = play(monitoringStarted({ id: 'm1', at: at(0) }), movementTapped({ id: 'v1', at: at(2) }));

    expect(state.live?.movements).toEqual([{ id: 'v1', at: at(2) }]);
    expect(state.outbox.at(-1)).toMatchObject({ kind: 'recordMovement', movement: { id: 'v1' } });
  });

  it('undoes the most recent tap, whichever kind it is', () => {
    const started = play(
      monitoringStarted({ id: 'm1', at: at(0) }),
      contractionTapped({ id: 'c1', at: at(5) }),
      contractionTapped({ id: 'x', at: at(6) }),
      movementTapped({ id: 'v1', at: at(7) })
    );

    const once = monitoringReducer(started, lastTapUndone());
    const twice = monitoringReducer(once, lastTapUndone());

    expect(once.live?.movements).toEqual([]);
    expect(once.outbox.at(-1)).toMatchObject({ kind: 'removeMovement', id: 'v1' });
    expect(twice.live?.contractions).toEqual([]);
    // the queued save of the undone contraction is dropped, its removal queued
    expect(kinds(twice)).toEqual(['start', 'recordMovement', 'removeMovement', 'removeContraction']);
  });

  it('ends a contraction going on when the monitoring stops, then ignores taps', () => {
    const stopped = play(
      monitoringStarted({ id: 'm1', at: at(0) }),
      contractionTapped({ id: 'c1', at: at(50) }),
      monitoringStopped({ id: 'unused', at: at(51) }),
      movementTapped({ id: 'v1', at: at(52) })
    );

    expect(stopped.live).toMatchObject({
      stoppedAt: at(51),
      contractions: [{ id: 'c1', endedAt: at(51) }],
      movements: []
    });
    expect(kinds(stopped)).toEqual(['start', 'saveContraction', 'stop']);
  });

  it('does not start a second monitoring while one runs, but starts a new one after a stop', () => {
    const running = play(monitoringStarted({ id: 'm1', at: at(0) }), monitoringStarted({ id: 'm2', at: at(1) }));
    const restarted = play(
      monitoringStarted({ id: 'm1', at: at(0) }),
      monitoringStopped({ id: 'x', at: at(10) }),
      monitoringStarted({ id: 'm2', at: at(20) })
    );

    expect(running.live?.id).toBe('m1');
    expect(restarted.live).toMatchObject({ id: 'm2', stoppedAt: null });
  });

  it('removes a request once sent, or once rejected — keeping the reason', () => {
    const state = play(monitoringStarted({ id: 'm1', at: at(0) }), movementTapped({ id: 'v1', at: at(2) }));

    const sent = monitoringReducer(state, requestSent(1));
    const rejected = monitoringReducer(sent, requestRejected({ seq: 2, error: 'IN_THE_FUTURE' }));

    expect(kinds(sent)).toEqual(['recordMovement']);
    expect(rejected.outbox).toEqual([]);
    expect(rejected.syncError).toBe('IN_THE_FUTURE');
  });

  it('times a practice contraction without any monitoring, sending only its latest state', () => {
    const started = play(practiceTapped({ id: 'p1', at: at(0) }));
    const ended = monitoringReducer(started, practiceTapped({ id: 'ignored', at: at(0.5) }));

    expect(started.practiceOngoing).toEqual({ id: 'p1', startedAt: at(0), endedAt: null });
    expect(started.live).toBeNull();
    expect(ended.practiceOngoing).toBeNull();
    expect(ended.outbox).toEqual([
      { seq: 2, kind: 'savePractice', contraction: { id: 'p1', startedAt: at(0), endedAt: at(0.5) } }
    ]);
  });

  it('removes a practice contraction recorded by mistake, even one going on', () => {
    const state = play(practiceTapped({ id: 'p1', at: at(0) }), practiceRemoved('p1'));

    expect(state.practiceOngoing).toBeNull();
    expect(kinds(state)).toEqual(['removePractice']);
  });

  it('keeps data recorded before sign-in for the first account, starts empty for another', () => {
    const before = play(monitoringStarted({ id: 'm1', at: at(0) }));

    const first = monitoringReducer(before, accountChanged(7));
    const again = monitoringReducer(first, accountChanged(7));
    const other = monitoringReducer(first, accountChanged(8));

    expect(first).toMatchObject({ ownerId: 7, live: { id: 'm1' } });
    expect(again).toBe(first);
    expect(other).toEqual({ ...initialMonitoringState, ownerId: 8 });
  });

  it('resumes a monitoring running on the server, unless one already runs here', () => {
    const fromServer = {
      id: 'm1',
      startedAt: at(0),
      stoppedAt: null,
      contractions: [
        { id: 'c1', startedAt: at(5), endedAt: at(6), intensity: 2 as const, braxtonHicks: false, curve: 'auto' as const }
      ],
      movements: []
    };

    const resumed = monitoringReducer(initialMonitoringState, liveResumed(fromServer));
    const busy = monitoringReducer(play(monitoringStarted({ id: 'm2', at: at(1) })), liveResumed(fromServer));

    expect(resumed.live).toEqual(fromServer);
    expect(resumed.outbox).toEqual([]);
    expect(busy.live?.id).toBe('m2');
  });

  it('drops a monitoring the server refused, with its queued taps and the refusal message', () => {
    const refused = monitoringReducer(
      play(
        monitoringStarted({ id: 'm2', at: at(0) }),
        contractionTapped({ id: 'c1', at: at(1) }),
        practiceTapped({ id: 'p1', at: at(2) })
      ),
      requestRejected({ seq: 1, error: 'MONITORING_ALREADY_RUNNING' })
    );

    const dropped = monitoringReducer(refused, liveDiscarded('m2'));

    expect(dropped.live).toBeNull();
    expect(kinds(dropped)).toEqual(['savePractice']);
    expect(dropped.syncError).toBeNull();
  });

  it('forgets a stopped monitoring deleted from the history, never a running one', () => {
    const running = play(monitoringStarted({ id: 'm1', at: at(0) }));
    const stopped = monitoringReducer(running, monitoringStopped({ id: 'x', at: at(10) }));

    expect(monitoringReducer(running, liveForgotten('m1')).live?.id).toBe('m1');
    expect(monitoringReducer(stopped, liveForgotten('m1'))).toMatchObject({ live: null, outbox: [] });
  });
});
