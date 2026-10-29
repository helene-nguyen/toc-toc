//~ Driven ports for practice contractions (Braxton-Hicks) recorded on their
// own, outside any monitoring — they come over days, not in one evening.
// Each one belongs to a user; its id is made by the phone, like every tap,
// so a retried sync lands once.

export interface PracticeContraction {
  id: string;
  startedAt: Date;
  // null while it goes on
  endedAt: Date | null;
}

//~ One line of the history: a practice contraction recorded on its own, or
// a painless (Braxton-Hicks) contraction marked during a monitoring
export interface PracticeEntry extends PracticeContraction {
  // the monitoring it was marked in; null when recorded on its own
  monitoringId: string | null;
}

export interface PracticeContractionRepository {
  // the user's one practice contraction going on, if any
  findOngoing(userId: number): Promise<PracticeContraction | null>;
  // insert, or replace the user's one with the same id
  save(userId: number, contraction: PracticeContraction): Promise<void>;
  // false when there was nothing of the user's to delete
  remove(id: string, userId: number): Promise<boolean>;
  // both kinds together, newest first
  history(userId: number): Promise<PracticeEntry[]>;
}
