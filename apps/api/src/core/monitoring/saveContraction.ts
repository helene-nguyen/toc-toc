//~ Use case: record a contraction, or update it — the same id comes back
// when the user taps "end", picks the intensity, or when a sync is retried.
// Rules: inside the monitoring, ends after it starts, one going on at a
// time (and none once the monitoring is stopped), no two overlapping.
import type { Clock } from '../clock.js';
import { err, ok, type Result } from '../result.js';
import { checkTime, type TimeError } from './timeRules.js';
import type { Contraction, MonitoringRepository } from './ports.js';

export type SaveContractionError =
  | 'MONITORING_NOT_FOUND'
  | 'MONITORING_STOPPED'
  | 'ENDS_BEFORE_START'
  | 'CONTRACTION_IN_PROGRESS'
  | 'CONTRACTIONS_OVERLAP'
  | TimeError;

// [start, end) as numbers, an ongoing contraction reaching forever
const span = ({ startedAt, endedAt }: Contraction): [number, number] => [
  startedAt.getTime(),
  endedAt?.getTime() ?? Infinity
];

const overlaps = (a: Contraction, b: Contraction): boolean => {
  const [aStart, aEnd] = span(a);
  const [bStart, bEnd] = span(b);
  return aStart < bEnd && bStart < aEnd;
};

export class SaveContraction {
  constructor(
    private readonly monitorings: MonitoringRepository,
    private readonly clock: Clock
  ) {}

  handle = async (
    monitoringId: string,
    contraction: Contraction
  ): Promise<Result<Contraction, SaveContractionError>> => {
    const monitoring = await this.monitorings.findById(monitoringId);
    if (!monitoring) return err('MONITORING_NOT_FOUND');

    const now = this.clock.now();
    const timeError =
      checkTime(monitoring, contraction.startedAt, now) ??
      (contraction.endedAt ? checkTime(monitoring, contraction.endedAt, now) : null);
    if (timeError) return err(timeError);
    if (contraction.endedAt && contraction.endedAt < contraction.startedAt) return err('ENDS_BEFORE_START');

    const others = monitoring.contractions.filter((other) => other.id !== contraction.id);
    if (contraction.endedAt === null) {
      if (monitoring.stoppedAt) return err('MONITORING_STOPPED');
      if (others.some((other) => other.endedAt === null)) return err('CONTRACTION_IN_PROGRESS');
    }
    if (others.some((other) => overlaps(contraction, other))) return err('CONTRACTIONS_OVERLAP');

    await this.monitorings.saveContraction(monitoringId, contraction);
    return ok(contraction);
  };
}
