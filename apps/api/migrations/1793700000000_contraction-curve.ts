//~ The intensity drawn on the trace, chosen apart from the felt pain:
// 'auto' follows the duration (as before), 'low' / 'medium' / 'high' cap
// the curve. Every contraction recorded so far was drawn the 'auto' way.
import type { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.addColumn('contraction', {
    curve: {
      type: 'varchar(10)',
      notNull: true,
      default: 'auto',
      check: "curve IN ('auto', 'low', 'medium', 'high')"
    }
  });
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropColumn('contraction', 'curve');
};
