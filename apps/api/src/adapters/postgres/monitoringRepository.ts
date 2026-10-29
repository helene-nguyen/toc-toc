//~ Driven adapter: MonitoringRepository backed by PostgreSQL (monitoring,
// contraction, movement). Reads are scoped by user_id; saving a tap is an
// upsert on the id the phone made, never moving a row to another monitoring.
import type pg from 'pg';
import type {
  Contraction,
  Monitoring,
  MonitoringRepository,
  MonitoringSummary,
  Movement,
  NewMonitoring
} from '../../core/monitoring/ports.js';

const MONITORING_COLUMNS = 'id, started_at AS "startedAt", stopped_at AS "stoppedAt"';

export class PostgresMonitoringRepository implements MonitoringRepository {
  constructor(private readonly pool: pg.Pool) {}

  findById = async (id: string, userId: number): Promise<Monitoring | null> => {
    const { rows } = await this.pool.query<Omit<Monitoring, 'contractions' | 'movements'>>(
      `SELECT ${MONITORING_COLUMNS} FROM monitoring WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return rows[0] ? this.withEvents(rows[0]) : null;
  };

  findRunning = async (userId: number): Promise<Monitoring | null> => {
    const { rows } = await this.pool.query<Omit<Monitoring, 'contractions' | 'movements'>>(
      `SELECT ${MONITORING_COLUMNS} FROM monitoring WHERE user_id = $1 AND stopped_at IS NULL`,
      [userId]
    );
    return rows[0] ? this.withEvents(rows[0]) : null;
  };

  list = async (userId: number): Promise<MonitoringSummary[]> => {
    const { rows } = await this.pool.query<MonitoringSummary>(
      `SELECT m.id, m.started_at AS "startedAt", m.stopped_at AS "stoppedAt",
         (SELECT count(*)::int FROM contraction c WHERE c.monitoring_id = m.id) AS "contractionCount",
         (SELECT count(*)::int FROM movement v WHERE v.monitoring_id = m.id) AS "movementCount"
       FROM monitoring m
       WHERE m.user_id = $1
       ORDER BY m.started_at DESC`,
      [userId]
    );
    return rows;
  };

  insert = async (userId: number, { id, startedAt }: NewMonitoring): Promise<Monitoring> => {
    const { rows } = await this.pool.query<Omit<Monitoring, 'contractions' | 'movements'>>(
      `INSERT INTO monitoring (id, user_id, started_at) VALUES ($1, $2, $3) RETURNING ${MONITORING_COLUMNS}`,
      [id, userId, startedAt]
    );
    return { ...rows[0], contractions: [], movements: [] };
  };

  stop = async (id: string, stoppedAt: Date): Promise<void> => {
    await this.pool.query('UPDATE monitoring SET stopped_at = $2 WHERE id = $1', [id, stoppedAt]);
  };

  remove = async (id: string, userId: number): Promise<boolean> => {
    const { rowCount } = await this.pool.query('DELETE FROM monitoring WHERE id = $1 AND user_id = $2', [id, userId]);
    return rowCount === 1;
  };

  adoptUnowned = async (userId: number): Promise<void> => {
    await this.pool.query('UPDATE monitoring SET user_id = $1 WHERE user_id IS NULL', [userId]);
  };

  saveContraction = async (monitoringId: string, { id, startedAt, endedAt, intensity }: Contraction): Promise<void> => {
    await this.pool.query(
      `INSERT INTO contraction (id, monitoring_id, started_at, ended_at, intensity)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE
         SET started_at = EXCLUDED.started_at, ended_at = EXCLUDED.ended_at, intensity = EXCLUDED.intensity
         WHERE contraction.monitoring_id = EXCLUDED.monitoring_id`,
      [id, monitoringId, startedAt, endedAt, intensity]
    );
  };

  removeContraction = async (monitoringId: string, contractionId: string): Promise<boolean> => {
    const { rowCount } = await this.pool.query('DELETE FROM contraction WHERE id = $1 AND monitoring_id = $2', [
      contractionId,
      monitoringId
    ]);
    return rowCount === 1;
  };

  saveMovement = async (monitoringId: string, { id, at }: Movement): Promise<void> => {
    await this.pool.query(
      `INSERT INTO movement (id, monitoring_id, at) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET at = EXCLUDED.at
         WHERE movement.monitoring_id = EXCLUDED.monitoring_id`,
      [id, monitoringId, at]
    );
  };

  removeMovement = async (monitoringId: string, movementId: string): Promise<boolean> => {
    const { rowCount } = await this.pool.query('DELETE FROM movement WHERE id = $1 AND monitoring_id = $2', [
      movementId,
      monitoringId
    ]);
    return rowCount === 1;
  };

  private withEvents = async (monitoring: Omit<Monitoring, 'contractions' | 'movements'>): Promise<Monitoring> => {
    const [contractions, movements] = await Promise.all([
      this.pool.query<Contraction>(
        `SELECT id, started_at AS "startedAt", ended_at AS "endedAt", intensity
         FROM contraction WHERE monitoring_id = $1 ORDER BY started_at`,
        [monitoring.id]
      ),
      this.pool.query<Movement>('SELECT id, at FROM movement WHERE monitoring_id = $1 ORDER BY at', [monitoring.id])
    ]);
    return { ...monitoring, contractions: contractions.rows, movements: movements.rows };
  };
}
