//~ The live monitoring, as recorded on this phone. Every tap changes this
// state at once — the screen never waits for the network — and queues the
// matching request in the outbox. useOutboxSync sends the requests to the
// Pi in order, whenever it is reachable. The state is saved in localStorage
// (see app/store.ts): a reload or a flat battery loses nothing.
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Contraction, CurveLevel, Monitoring, Movement } from './monitoringTypes';
import type { PracticeContraction } from '../practice/practiceTypes';
import { withPain, type Pain } from './feeling';

//~ One request waiting to reach the API — `seq` identifies it in the queue
export type OutboxRequest = { seq: number } & (
  | { kind: 'start'; id: string; startedAt: string }
  | { kind: 'stop'; id: string; stoppedAt: string }
  | { kind: 'saveContraction'; monitoringId: string; contraction: Contraction }
  | { kind: 'removeContraction'; monitoringId: string; id: string }
  | { kind: 'recordMovement'; monitoringId: string; movement: Movement }
  | { kind: 'removeMovement'; monitoringId: string; id: string }
  | { kind: 'savePractice'; contraction: PracticeContraction }
  | { kind: 'removePractice'; id: string }
);

// a request before it gets its place in the queue
type NewRequest = OutboxRequest extends infer R ? (R extends OutboxRequest ? Omit<R, 'seq'> : never) : never;

export interface MonitoringState {
  // whose data this is: a phone can be shared, each account keeps its own
  ownerId: number | null;
  // the monitoring running on this phone, or the last one once stopped
  live: Monitoring | null;
  // a practice contraction (Préparation tab) being timed, outside any monitoring
  practiceOngoing: PracticeContraction | null;
  outbox: OutboxRequest[];
  nextSeq: number;
  // why the server refused the last request, or that it can't be reached
  syncError: string | null;
}

export const initialMonitoringState: MonitoringState = {
  ownerId: null,
  live: null,
  practiceOngoing: null,
  outbox: [],
  nextSeq: 1,
  syncError: null
};

//~ A tap: a fresh id and the moment it happened. Tests pass their own.
export interface Tap {
  id: string;
  at: string;
}

const prepareTap = (tap?: Partial<Tap>) => ({
  payload: { id: tap?.id ?? crypto.randomUUID(), at: tap?.at ?? new Date().toISOString() }
});

const enqueue = (state: MonitoringState, request: NewRequest) => {
  state.outbox.push({ ...request, seq: state.nextSeq } as OutboxRequest);
  state.nextSeq += 1;
};

// only the latest state of a contraction needs sending: an older save still
// queued is replaced (PUT is idempotent, so one already in flight is harmless)
const enqueueSave = (state: MonitoringState, monitoringId: string, contraction: Contraction) => {
  state.outbox = state.outbox.filter(
    (request) => !(request.kind === 'saveContraction' && request.contraction.id === contraction.id)
  );
  enqueue(state, { kind: 'saveContraction', monitoringId, contraction: { ...contraction } });
};

// same idea for practice contractions: only the latest state needs sending
const enqueuePractice = (state: MonitoringState, contraction: PracticeContraction) => {
  state.outbox = state.outbox.filter(
    (request) => !(request.kind === 'savePractice' && request.contraction.id === contraction.id)
  );
  enqueue(state, { kind: 'savePractice', contraction: { ...contraction } });
};

// the requests that belong to one monitoring (practice contractions don't)
const isOfMonitoring = (request: OutboxRequest, id: string) =>
  'monitoringId' in request
    ? request.monitoringId === id
    : (request.kind === 'start' || request.kind === 'stop') && request.id === id;

const isRunning = (live: Monitoring | null): live is Monitoring => live !== null && live.stoppedAt === null;

const monitoringSlice = createSlice({
  name: 'monitoring',
  initialState: initialMonitoringState,
  reducers: {
    monitoringStarted: {
      reducer: (state, { payload: { id, at } }: PayloadAction<Tap>) => {
        if (isRunning(state.live)) return;
        state.live = { id, startedAt: at, stoppedAt: null, contractions: [], movements: [] };
        enqueue(state, { kind: 'start', id, startedAt: at });
      },
      prepare: prepareTap
    },

    //~ A contraction still going on ends with the monitoring
    monitoringStopped: {
      reducer: (state, { payload: { at } }: PayloadAction<Tap>) => {
        const live = state.live;
        if (!isRunning(live)) return;
        const ongoing = live.contractions.find((contraction) => contraction.endedAt === null);
        if (ongoing) {
          ongoing.endedAt = at;
          enqueueSave(state, live.id, ongoing);
        }
        live.stoppedAt = at;
        enqueue(state, { kind: 'stop', id: live.id, stoppedAt: at });
      },
      prepare: prepareTap
    },

    //~ The big button: starts a contraction, or ends the one going on
    contractionTapped: {
      reducer: (state, { payload: { id, at } }: PayloadAction<Tap>) => {
        const live = state.live;
        if (!isRunning(live)) return;
        const ongoing = live.contractions.find((contraction) => contraction.endedAt === null);
        if (ongoing) {
          // a tap can't end a contraction before it began (clock or double tap)
          ongoing.endedAt = at < ongoing.startedAt ? ongoing.startedAt : at;
          enqueueSave(state, live.id, ongoing);
        } else {
          const contraction: Contraction = {
            id,
            startedAt: at,
            endedAt: null,
            intensity: 2,
            braxtonHicks: false,
            curve: 'auto'
          };
          live.contractions.push(contraction);
          enqueueSave(state, live.id, contraction);
        }
      },
      prepare: prepareTap
    },

    //~ The pain felt, asked once a contraction has ended
    painChosen: (state, { payload }: PayloadAction<Pain>) => {
      const live = state.live;
      const last = live?.contractions.at(-1);
      if (!live || !last) return;
      Object.assign(last, withPain(last, payload));
      enqueueSave(state, live.id, last);
    },

    //~ The pain changed afterwards, from the journal — the session may be
    // stopped already; the server accepts the change either way
    painChanged: (state, { payload }: PayloadAction<{ contractionId: string; pain: Pain }>) => {
      const live = state.live;
      const contraction = live?.contractions.find((candidate) => candidate.id === payload.contractionId);
      if (!live || !contraction) return;
      Object.assign(contraction, withPain(contraction, payload.pain));
      enqueueSave(state, live.id, contraction);
    },

    //~ The intensity drawn on the trace, asked with the pain
    curveChosen: (state, { payload }: PayloadAction<CurveLevel>) => {
      const live = state.live;
      const last = live?.contractions.at(-1);
      if (!live || !last) return;
      last.curve = payload;
      enqueueSave(state, live.id, last);
    },

    //~ ...or changed afterwards, from the journal
    curveChanged: (state, { payload }: PayloadAction<{ contractionId: string; curve: CurveLevel }>) => {
      const live = state.live;
      const contraction = live?.contractions.find((candidate) => candidate.id === payload.contractionId);
      if (!live || !contraction) return;
      contraction.curve = payload.curve;
      enqueueSave(state, live.id, contraction);
    },

    movementTapped: {
      reducer: (state, { payload: { id, at } }: PayloadAction<Tap>) => {
        const live = state.live;
        if (!isRunning(live)) return;
        live.movements.push({ id, at });
        enqueue(state, { kind: 'recordMovement', monitoringId: live.id, movement: { id, at } });
      },
      prepare: prepareTap
    },

    //~ "Undo": removes the most recent tap, contraction or movement
    lastTapUndone: (state) => {
      const live = state.live;
      if (!isRunning(live)) return;
      const contraction = live.contractions.at(-1);
      const movement = live.movements.at(-1);
      if (!contraction && !movement) return;

      if (contraction && (!movement || contraction.startedAt >= movement.at)) {
        live.contractions.pop();
        state.outbox = state.outbox.filter(
          (request) => !(request.kind === 'saveContraction' && request.contraction.id === contraction.id)
        );
        enqueue(state, { kind: 'removeContraction', monitoringId: live.id, id: contraction.id });
      } else if (movement) {
        live.movements.pop();
        enqueue(state, { kind: 'removeMovement', monitoringId: live.id, id: movement.id });
      }
    },

    //~ A stopped monitoring deleted from the history: the phone forgets it too
    liveForgotten: (state, { payload: id }: PayloadAction<string>) => {
      if (state.live?.id !== id || state.live.stoppedAt === null) return;
      state.live = null;
      // only this monitoring's requests go; practice contractions stay
      state.outbox = state.outbox.filter((request) => !isOfMonitoring(request, id));
    },

    //~ A monitoring running on the server but not on this phone (signed in
    // again, another phone): it becomes the live one here
    liveResumed: (state, { payload }: PayloadAction<Monitoring>) => {
      if (isRunning(state.live)) return;
      state.live = payload;
    },

    //~ A monitoring started on this phone that the server refused (another
    // one was already running there): nothing of it can be saved, drop it
    liveDiscarded: (state, { payload: id }: PayloadAction<string>) => {
      if (state.live?.id !== id) return;
      state.live = null;
      state.outbox = state.outbox.filter((request) => !isOfMonitoring(request, id));
      state.syncError = null;
    },

    //~ Who is signed in, once known. Data recorded before accounts existed
    // (no owner yet) stays with the first account; another account starts empty.
    accountChanged: (state, { payload: userId }: PayloadAction<number>) => {
      if (state.ownerId === userId) return;
      if (state.ownerId === null) {
        state.ownerId = userId;
        return;
      }
      return { ...initialMonitoringState, ownerId: userId };
    },

    //~ Signing out leaves nothing of this account on the phone
    signedOut: () => initialMonitoringState,

    //~ The Préparation button: starts a practice contraction, or ends the
    // one going on — no monitoring needed
    practiceTapped: {
      reducer: (state, { payload: { id, at } }: PayloadAction<Tap>) => {
        const ongoing = state.practiceOngoing;
        if (ongoing) {
          enqueuePractice(state, { ...ongoing, endedAt: at < ongoing.startedAt ? ongoing.startedAt : at });
          state.practiceOngoing = null;
        } else {
          state.practiceOngoing = { id, startedAt: at, endedAt: null };
          enqueuePractice(state, state.practiceOngoing);
        }
      },
      prepare: prepareTap
    },

    //~ A practice contraction recorded by mistake
    practiceRemoved: (state, { payload: id }: PayloadAction<string>) => {
      if (state.practiceOngoing?.id === id) state.practiceOngoing = null;
      state.outbox = state.outbox.filter(
        (request) => !(request.kind === 'savePractice' && request.contraction.id === id)
      );
      enqueue(state, { kind: 'removePractice', id });
    },

    //~ Outcomes of useOutboxSync
    requestSent: (state, { payload: seq }: PayloadAction<number>) => {
      state.outbox = state.outbox.filter((request) => request.seq !== seq);
      state.syncError = null;
    },
    // the server said no: keeping the request would block the queue forever
    requestRejected: (state, { payload }: PayloadAction<{ seq: number; error: string }>) => {
      state.outbox = state.outbox.filter((request) => request.seq !== payload.seq);
      state.syncError = payload.error;
    },
    // the server can't be reached, or the session needs signing in again:
    // the queue waits and retries
    syncPaused: (state, { payload = 'OFFLINE' }: PayloadAction<'OFFLINE' | 'SIGNED_OUT' | undefined>) => {
      state.syncError = payload;
    }
  }
});

export const {
  accountChanged,
  signedOut,
  monitoringStarted,
  monitoringStopped,
  contractionTapped,
  painChosen,
  painChanged,
  curveChosen,
  curveChanged,
  movementTapped,
  lastTapUndone,
  liveForgotten,
  liveResumed,
  liveDiscarded,
  practiceTapped,
  practiceRemoved,
  requestSent,
  requestRejected,
  syncPaused
} = monitoringSlice.actions;

export const monitoringReducer = monitoringSlice.reducer;
