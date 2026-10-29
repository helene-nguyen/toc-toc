//~ Use case: the user's practice history — contractions recorded on their
// own and those marked painless during a monitoring, newest first.
import type { PracticeContractionRepository, PracticeEntry } from './ports.js';

export class ListPracticeHistory {
  constructor(private readonly practice: PracticeContractionRepository) {}

  handle = async (userId: number): Promise<PracticeEntry[]> => this.practice.history(userId);
}
