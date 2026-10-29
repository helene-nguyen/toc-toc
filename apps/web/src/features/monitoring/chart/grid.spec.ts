import { describe, expect, it } from 'vitest';
import { gridSteps } from './grid';

describe('gridSteps', () => {
  it('draws the real monitoring paper at the default zoom (54 px a minute)', () => {
    expect(gridSteps(54 / 60)).toEqual({ minor: 15, major: 60, strong: 300, label: 300 });
  });

  it('thins out the lines and spaces the labels when zoomed out', () => {
    expect(gridSteps(3 / 60)).toEqual({ minor: 300, major: 1800, strong: 9000, label: 1800 });
  });

  it('keeps labels on a line', () => {
    for (const pxPerMinute of [1, 4, 12, 30, 54, 120, 240]) {
      const { minor, label } = gridSteps(pxPerMinute / 60);
      expect(label % minor).toBe(0);
    }
  });
});
