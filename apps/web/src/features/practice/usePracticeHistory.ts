//~ The practice history as the screen shows it: what the server knows,
// plus what this phone recorded and hasn't sent yet (offline, or a second
// ago), minus what it removed — so a tap shows at once, even without network.
import { useMemo } from 'react';
import { useAppSelector } from '../../app/hooks';
import { useListPracticeQuery } from './practiceApi';
import type { PracticeEntry } from './practiceTypes';

export const usePracticeHistory = () => {
  const { data = [], isLoading, isError } = useListPracticeQuery();
  const outbox = useAppSelector((state) => state.monitoring.outbox);
  const ongoing = useAppSelector((state) => state.monitoring.practiceOngoing);

  const entries = useMemo(() => {
    const byId = new Map<string, PracticeEntry>(data.map((entry) => [entry.id, entry]));
    for (const request of outbox) {
      if (request.kind === 'savePractice') byId.set(request.contraction.id, { ...request.contraction, monitoringId: null });
      if (request.kind === 'removePractice') byId.delete(request.id);
    }
    if (ongoing) byId.set(ongoing.id, { ...ongoing, monitoringId: null });
    return [...byId.values()];
  }, [data, outbox, ongoing]);

  return { entries, ongoing, isLoading, isError };
};
