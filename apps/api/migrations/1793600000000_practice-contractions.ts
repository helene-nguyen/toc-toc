//~ Practice contractions (Braxton-Hicks) recorded on their own, outside any
// monitoring — the "Préparation" tab. Painless contractions marked during a
// monitoring stay in contraction (braxton_hicks); the history joins both.
import type { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.createTable('practice_contraction', {
    id: { type: 'uuid', primaryKey: true },
    user_id: { type: 'integer', notNull: true, references: 'user', onDelete: 'CASCADE' },
    started_at: { type: 'timestamptz', notNull: true },
    // NULL while it goes on
    ended_at: { type: 'timestamptz' }
  });
  pgm.createIndex('practice_contraction', ['user_id', 'started_at']);
  // one going on per user, like the core says
  pgm.sql(
    `CREATE UNIQUE INDEX practice_contraction_one_ongoing_idx ON practice_contraction (user_id) WHERE ended_at IS NULL`
  );
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropTable('practice_contraction');
};
