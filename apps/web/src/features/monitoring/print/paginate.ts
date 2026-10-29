//~ How a session spreads over A4 landscape pages. The trace is cut into
// rows of 30 minutes or 1 hour; the first page also carries the header, so
// it holds one row less. With the movements on their own strip a row is
// taller, so fewer fit. The journal follows on pages of its own.
import type { ChartMode } from '../chart/drawChart';

export type RowMinutes = 30 | 60;

// trace rows per page: [first page, next pages]
const ROWS_PER_PAGE: Record<ChartMode, [number, number]> = { merged: [3, 4], split: [2, 3] };
// journal lines per page: [first journal page, next ones]
const JOURNAL_PER_PAGE: [number, number] = [22, 26];

// height of a trace row on the page, in px (the page is 1123 × 794)
export const ROW_HEIGHT: Record<ChartMode, number> = { merged: 136, split: 190 };

export type PrintPage = { kind: 'trace'; rows: number[] } | { kind: 'journal'; from: number; to: number };

export interface PaginateInput {
  // seconds
  duration: number;
  rowMinutes: RowMinutes;
  mode: ChartMode;
  // lines of journal to print, 0 for none
  journalLines: number;
}

export const paginate = ({ duration, rowMinutes, mode, journalLines }: PaginateInput): PrintPage[] => {
  const rowCount = Math.max(1, Math.ceil(duration / (rowMinutes * 60)));
  const pages: PrintPage[] = [];

  for (let row = 0; row < rowCount; ) {
    const fits = ROWS_PER_PAGE[mode][pages.length === 0 ? 0 : 1];
    const rows = Array.from({ length: Math.min(fits, rowCount - row) }, (_, index) => row + index);
    pages.push({ kind: 'trace', rows });
    row += rows.length;
  }

  for (let line = 0; line < journalLines; ) {
    const fits = JOURNAL_PER_PAGE[line === 0 ? 0 : 1];
    const to = Math.min(line + fits, journalLines);
    pages.push({ kind: 'journal', from: line, to });
    line = to;
  }

  return pages;
};
