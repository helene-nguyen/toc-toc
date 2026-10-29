//~ Accounts: the app is shared, each person sees only their own monitorings.
// - "user": email (unique, stored lowercase) and a password hash, NULL for
//   accounts opened through Google
// - auth_provider: which Google account maps to which user
// - monitoring.user_id: the owner. Nullable only for monitorings recorded
//   before accounts existed; the first account created adopts them
// - "one running monitoring" now holds per user
import type { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.createTable('user', {
    id: 'id',
    email: { type: 'varchar(255)', notNull: true, unique: true },
    name: { type: 'varchar(255)' },
    password: { type: 'varchar(255)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });

  pgm.createTable('auth_provider', {
    id: 'id',
    user_id: { type: 'integer', notNull: true, references: 'user', onDelete: 'CASCADE' },
    provider: { type: 'varchar(50)', notNull: true },
    provider_account_id: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });
  // the same Google account can only ever be linked once
  pgm.addConstraint('auth_provider', 'auth_provider_provider_account_unique', {
    unique: ['provider', 'provider_account_id']
  });

  pgm.addColumn('monitoring', {
    user_id: { type: 'integer', references: 'user', onDelete: 'CASCADE' }
  });
  pgm.createIndex('monitoring', ['user_id', 'started_at']);
  pgm.sql(`DROP INDEX monitoring_one_running_idx`);
  pgm.sql(`CREATE UNIQUE INDEX monitoring_one_running_idx ON monitoring (user_id) WHERE stopped_at IS NULL`);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP INDEX monitoring_one_running_idx`);
  pgm.dropColumn('monitoring', 'user_id');
  pgm.sql(`CREATE UNIQUE INDEX monitoring_one_running_idx ON monitoring ((true)) WHERE stopped_at IS NULL`);
  pgm.dropTable('auth_provider');
  pgm.dropTable('user');
};
