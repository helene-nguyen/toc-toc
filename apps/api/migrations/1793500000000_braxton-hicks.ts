//~ Painless contractions (Braxton-Hicks): marked on the contraction, so the
// trace draws them low and the labour figures leave them out. Every
// contraction recorded so far was a labour one.
import type { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.addColumn('contraction', {
    braxton_hicks: { type: 'boolean', notNull: true, default: false }
  });
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropColumn('contraction', 'braxton_hicks');
};
