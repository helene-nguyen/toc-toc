//~ Grid steps for the monitoring paper at any zoom. Fine lines stay at
// least 6 px apart and clock labels 52 px apart; at the default zoom this
// gives the real paper: a line every 15 s, a darker one every minute, a
// thick one every 5 minutes.
const MINOR = [15, 60, 300, 900, 1800, 3600, 7200];
const MAJOR: Record<number, number> = { 15: 60, 60: 300, 300: 1800, 900: 3600, 1800: 3600, 3600: 7200, 7200: 14400 };
const LABEL = [300, 600, 900, 1800, 3600, 7200, 14400];

export interface GridSteps {
  // seconds between lines
  minor: number;
  major: number;
  strong: number;
  // seconds between clock labels — always a multiple of `minor`
  label: number;
}

export const gridSteps = (pxPerSecond: number): GridSteps => {
  const minor = MINOR.find((step) => step * pxPerSecond >= 6) ?? 7200;
  const major = MAJOR[minor];
  const label = LABEL.find((step) => step * pxPerSecond >= 52 && step % minor === 0) ?? 14400;
  return { minor, major, strong: major * 5, label };
};
