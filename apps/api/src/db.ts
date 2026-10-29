//~ Import modules
import pg from 'pg';

//~ Database connection config, built from the discrete POSTGRES_* variables (see .env.example)
export const dbConfig = () => ({
  // 127.0.0.1, not localhost: Node may resolve localhost to IPv6 (::1) first
  host: process.env.POSTGRES_HOST ?? '127.0.0.1',
  port: Number(process.env.POSTGRES_PORT ?? 5436),
  database: process.env.POSTGRES_DB ?? 'toctoc',
  user: process.env.POSTGRES_USER ?? 'toctoc',
  password: process.env.POSTGRES_PASSWORD ?? 'toctoc'
});

export type DbConfig = ReturnType<typeof dbConfig>;

//~ One pool for the whole process — pg manages the individual connections
export const createPool = (): pg.Pool => new pg.Pool(dbConfig());
