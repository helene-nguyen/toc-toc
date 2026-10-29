//~ What the API answers about practice contractions — dates as ISO strings.

export interface PracticeContraction {
  id: string;
  startedAt: string;
  // null while it goes on
  endedAt: string | null;
}

//~ One line of the history: recorded on its own, or marked painless during
// a monitoring (then it is changed from its session, not from here)
export interface PracticeEntry extends PracticeContraction {
  monitoringId: string | null;
}
