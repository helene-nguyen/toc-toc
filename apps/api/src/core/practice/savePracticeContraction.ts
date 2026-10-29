//~ Use case: record a practice contraction, or end it — the same id comes
// back when the user taps "it's over", or when a sync is retried.
// Rules: not in the future, ends after it starts, one going on at a time.
import type { Clock } from '../clock.js';
import { err, ok, type Result } from '../result.js';
import { isInTheFuture } from '../monitoring/timeRules.js';
import type { PracticeContraction, PracticeContractionRepository } from './ports.js';

export type SavePracticeContractionError = 'IN_THE_FUTURE' | 'ENDS_BEFORE_START' | 'CONTRACTION_IN_PROGRESS';

export class SavePracticeContraction {
  constructor(
    private readonly practice: PracticeContractionRepository,
    private readonly clock: Clock
  ) {}

  handle = async (
    userId: number,
    contraction: PracticeContraction
  ): Promise<Result<PracticeContraction, SavePracticeContractionError>> => {
    const now = this.clock.now();
    if (isInTheFuture(contraction.startedAt, now)) return err('IN_THE_FUTURE');
    if (contraction.endedAt && isInTheFuture(contraction.endedAt, now)) return err('IN_THE_FUTURE');
    if (contraction.endedAt && contraction.endedAt < contraction.startedAt) return err('ENDS_BEFORE_START');

    if (contraction.endedAt === null) {
      const ongoing = await this.practice.findOngoing(userId);
      if (ongoing && ongoing.id !== contraction.id) return err('CONTRACTION_IN_PROGRESS');
    }

    await this.practice.save(userId, contraction);
    return ok(contraction);
  };
}
