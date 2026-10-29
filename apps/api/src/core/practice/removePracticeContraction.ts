//~ Use case: remove a practice contraction recorded by mistake.
import { err, ok, type Result } from '../result.js';
import type { PracticeContractionRepository } from './ports.js';

export class RemovePracticeContraction {
  constructor(private readonly practice: PracticeContractionRepository) {}

  handle = async (id: string, userId: number): Promise<Result<void, 'CONTRACTION_NOT_FOUND'>> =>
    (await this.practice.remove(id, userId)) ? ok(undefined) : err('CONTRACTION_NOT_FOUND');
}
