//~ Monitorings: one row per session of labour tracking, with the
// contractions and the baby's movements tapped during it.
// - ids are UUIDs made by the phone: taps are saved on the device first and
//   synced later, so a retried request must land on the same row
// - two partial unique indexes back the core's rules at the database level:
//   at most one monitoring running, at most one contraction going on in it
import type { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.createTable('monitoring', {
    id: { type: 'uuid', primaryKey: true },
    started_at: { type: 'timestamptz', notNull: true },
    // NULL while it runs
    stopped_at: { type: 'timestamptz' }
  });
  pgm.createIndex('monitoring', 'started_at');
  pgm.sql(`CREATE UNIQUE INDEX monitoring_one_running_idx ON monitoring ((true)) WHERE stopped_at IS NULL`);

  pgm.createTable('contraction', {
    id: { type: 'uuid', primaryKey: true },
    monitoring_id: { type: 'uuid', notNull: true, references: 'monitoring', onDelete: 'CASCADE' },
    started_at: { type: 'timestamptz', notNull: true },
    // NULL while the contraction goes on
    ended_at: { type: 'timestamptz' },
    // felt intensity: 1 light, 2 medium, 3 strong
    intensity: { type: 'smallint', notNull: true, default: 2, check: 'intensity BETWEEN 1 AND 3' }
  });
  pgm.createIndex('contraction', ['monitoring_id', 'started_at']);
  pgm.sql(
    `CREATE UNIQUE INDEX contraction_one_ongoing_idx ON contraction (monitoring_id) WHERE ended_at IS NULL`
  );

  pgm.createTable('movement', {
    id: { type: 'uuid', primaryKey: true },
    monitoring_id: { type: 'uuid', notNull: true, references: 'monitoring', onDelete: 'CASCADE' },
    at: { type: 'timestamptz', notNull: true }
  });
  pgm.createIndex('movement', ['monitoring_id', 'at']);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropTable('movement');
  pgm.dropTable('contraction');
  pgm.dropTable('monitoring');
};
