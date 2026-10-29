import { describe, expect, it } from 'vitest';
import {
  contractionTapped,
  initialMonitoringState,
  intensityChosen,
  lastTapUndone,
  monitoringReducer,
  monitoringStarted,
  monitoringStopped,
  movementTapped,
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

    expect(state.live?.contractions).toEqual([{ id: 'c1', startedAt: at(5), endedAt: at(6), intensity: 2 }]);
    expect(kinds(state)).toEqual(['start', 'saveContraction']);
  });

  it('sets the intensity of the last contraction', () => {
    const state = play(
      monitoringStarted({ id: 'm1', at: at(0) }),
      contractionTapped({ id: 'c1', at: at(5) }),
      contractionTapped({ id: 'x', at: at(6) }),
      intensityChosen(3)
    );

    expect(state.live?.contractions[0].intensity).toBe(3);
    expect(state.outbox.at(-1)).toMatchObject({ kind: 'saveContraction', contraction: { id: 'c1', intensity: 3 } });
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
});
