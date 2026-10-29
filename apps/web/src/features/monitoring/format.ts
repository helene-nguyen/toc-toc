//~ How times read on screen: durations as m:ss or h:mm:ss, moments as the
// clock time — "14:32" says more at 3 a.m. than "52 min since the start".

const two = (value: number) => String(Math.floor(Math.max(0, value))).padStart(2, '0');

// 125 → "2:05"
export const minSec = (seconds: number) => `${Math.floor(Math.max(0, seconds) / 60)}:${two(seconds % 60)}`;

// 3725 → "01:02:05"
export const hourMinSec = (seconds: number) => `${two(seconds / 3600)}:${two((seconds % 3600) / 60)}:${two(seconds % 60)}`;

// a window or a session length: "12 min", "1 h 30"
export const span = (seconds: number) =>
  seconds >= 3600
    ? `${Math.floor(seconds / 3600)} h ${two((seconds % 3600) / 60)}`
    : `${Math.max(1, Math.round(seconds / 60))} min`;

// the clock time `seconds` after an ISO start: "14:32"
export const clockAt = (startedAt: string, seconds = 0) => {
  const date = new Date(Date.parse(startedAt) + seconds * 1000);
  return `${two(date.getHours())}:${two(date.getMinutes())}`;
};

// "jeudi 29 octobre", capitalised for a title
const dayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
export const longDay = (iso: string) => {
  const day = dayFormat.format(new Date(iso));
  return day.charAt(0).toUpperCase() + day.slice(1);
};

// "29/10/2026"
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR');
