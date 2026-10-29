//~ What the "Préparation" tab shows about practice contractions: how many
// today, how long they last, how far apart, the last seven days — and the
// history grouped by day. Days are the phone's local calendar days.
import type { PracticeEntry } from '../practiceTypes';

const mean = (values: number[]): number | null =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

const two = (value: number) => String(value).padStart(2, '0');

// "2026-10-29", in local time
export const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;

const startOf = (entry: PracticeEntry) => Date.parse(entry.startedAt);
const durationOf = (entry: PracticeEntry) =>
  entry.endedAt === null ? null : (Date.parse(entry.endedAt) - Date.parse(entry.startedAt)) / 1000;

export interface PracticeSummary {
  todayCount: number;
  // seconds, finished ones of today
  todayAverageDuration: number | null;
  // seconds, start to start, today
  todayAverageInterval: number | null;
  // seconds since the last one started
  sinceLast: number | null;
  // seconds; null while it goes on
  lastDuration: number | null;
  // the last seven days, oldest first, today last
  week: { day: string; count: number }[];
}

export const practiceSummary = (entries: PracticeEntry[], now: Date): PracticeSummary => {
  const chronological = [...entries].sort((a, b) => startOf(a) - startOf(b));
  const today = dayKey(now);
  const todays = chronological.filter((entry) => dayKey(new Date(startOf(entry))) === today);
  const todayStarts = todays.map(startOf);
  const last = chronological.at(-1);

  const week = Array.from({ length: 7 }, (_, index) => {
    const day = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index)));
    return { day, count: chronological.filter((entry) => dayKey(new Date(startOf(entry))) === day).length };
  });

  return {
    todayCount: todays.length,
    todayAverageDuration: mean(todays.map(durationOf).filter((duration): duration is number => duration !== null)),
    todayAverageInterval: mean(todayStarts.slice(1).map((start, index) => (start - todayStarts[index]) / 1000)),
    sinceLast: last ? (now.getTime() - startOf(last)) / 1000 : null,
    lastDuration: last ? durationOf(last) : null,
    week
  };
};

export interface PracticeRow {
  entry: PracticeEntry;
  // seconds; null while it goes on
  duration: number | null;
  // seconds since the previous one started, whatever its day
  interval: number | null;
}

export interface PracticeDay {
  day: string;
  // newest first
  rows: PracticeRow[];
}

//~ The history, one block per day, newest day first
export const groupByDay = (entries: PracticeEntry[]): PracticeDay[] => {
  const chronological = [...entries].sort((a, b) => startOf(a) - startOf(b));
  const rows = chronological.map((entry, index) => ({
    entry,
    duration: durationOf(entry),
    interval: index === 0 ? null : (startOf(entry) - startOf(chronological[index - 1])) / 1000
  }));

  const days = new Map<string, PracticeRow[]>();
  for (const row of rows.reverse()) {
    const day = dayKey(new Date(startOf(row.entry)));
    days.set(day, [...(days.get(day) ?? []), row]);
  }
  return [...days].map(([day, dayRows]) => ({ day, rows: dayRows }));
};
