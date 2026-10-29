//~ One monitoring by id — from the phone when it is the one recorded here
// (freshest, and readable offline), from the API otherwise.
import { useAppSelector } from '../../../app/hooks';
import { useGetMonitoringQuery } from '../monitoringApi';

export const useMonitoring = (id: string) => {
  const live = useAppSelector((state) => state.monitoring.live);
  const local = live?.id === id ? live : null;
  const query = useGetMonitoringQuery(id, { skip: local !== null });

  return {
    monitoring: local ?? query.data ?? null,
    isLoading: local === null && query.isLoading,
    isError: local === null && query.isError
  };
};
