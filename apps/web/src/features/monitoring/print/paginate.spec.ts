import { describe, expect, it } from 'vitest';
import { paginate } from './paginate';

describe('paginate', () => {
  it('puts a short session on one page', () => {
    expect(paginate({ duration: 20 * 60, rowMinutes: 30, mode: 'split', journalLines: 0 })).toEqual([
      { kind: 'trace', rows: [0] }
    ]);
  });

  it('fits one row less on the first page, which carries the header', () => {
    // 4 h at 30 min a row = 8 rows; split: 2 then 3 a page
    expect(paginate({ duration: 4 * 3600, rowMinutes: 30, mode: 'split', journalLines: 0 })).toEqual([
      { kind: 'trace', rows: [0, 1] },
      { kind: 'trace', rows: [2, 3, 4] },
      { kind: 'trace', rows: [5, 6, 7] }
    ]);
  });

  it('fits more rows when movements are merged, and fewer with 1 h rows', () => {
    expect(paginate({ duration: 4 * 3600, rowMinutes: 30, mode: 'merged', journalLines: 0 })).toHaveLength(3);
    expect(paginate({ duration: 4 * 3600, rowMinutes: 60, mode: 'merged', journalLines: 0 })).toEqual([
      { kind: 'trace', rows: [0, 1, 2] },
      { kind: 'trace', rows: [3] }
    ]);
  });

  it('adds the journal on pages of its own', () => {
    const pages = paginate({ duration: 3600, rowMinutes: 60, mode: 'merged', journalLines: 30 });

    expect(pages).toEqual([
      { kind: 'trace', rows: [0] },
      { kind: 'journal', from: 0, to: 22 },
      { kind: 'journal', from: 22, to: 30 }
    ]);
  });
});
