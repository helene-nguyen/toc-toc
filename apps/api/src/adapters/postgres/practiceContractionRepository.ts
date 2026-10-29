//~ Driven adapter: PracticeContractionRepository backed by PostgreSQL.
// The history reads two tables: practice_contraction, and the painless
// contractions of the user's monitorings.
import type pg from 'pg';
import type {
  PracticeContraction,
  PracticeContractionRepository,
  PracticeEntry
} from '../../core/practice/ports.js';

// a generous cap: weeks of practice contractions fit many times over
const HISTORY_LIMIT = 1000;

export class PostgresPracticeContractionRepository implements PracticeContractionRepository {
  constructor(private readonly pool: pg.Pool) {}

  findOngoing = async (userId: number): Promise<PracticeContraction | null> => {
    const { rows } = await this.pool.query<PracticeContraction>(
      `SELECT id, started_at AS "startedAt", ended_at AS "endedAt"
       FROM practice_contraction WHERE user_id = $1 AND ended_at IS NULL`,
      [userId]
    );
    return rows[0] ?? null;
  };

  save = async (userId: number, { id, startedAt, endedAt }: PracticeContraction): Promise<void> => {
    await this.pool.query(
      `INSERT INTO practice_contraction (id, user_id, started_at, ended_at) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET started_at = EXCLUDED.started_at, ended_at = EXCLUDED.ended_at
         WHERE practice_contraction.user_id = EXCLUDED.user_id`,
      [id, userId, startedAt, endedAt]
    );
  };

  remove = async (id: string, userId: number): Promise<boolean> => {
    const { rowCount } = await this.pool.query('DELETE FROM practice_contraction WHERE id = $1 AND user_id = $2', [
      id,
      userId
    ]);
    return rowCount === 1;
  };

  history = async (userId: number): Promise<PracticeEntry[]> => {
    const { rows } = await this.pool.query<PracticeEntry>(
      `SELECT id, started_at AS "startedAt", ended_at AS "endedAt", NULL::uuid AS "monitoringId"
       FROM practice_contraction WHERE user_id = $1
       UNION ALL
       SELECT c.id, c.started_at, c.ended_at, c.monitoring_id
       FROM contraction c JOIN monitoring m ON m.id = c.monitoring_id
       WHERE m.user_id = $1 AND c.braxton_hicks
       ORDER BY "startedAt" DESC
       LIMIT ${HISTORY_LIMIT}`,
      [userId]
    );
    return rows;
  };
}
