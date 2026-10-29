//~ Deleting a session, the same way from the history and from its page:
// the server first, then the phone forgets it if it was recorded here.
import { useState } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import { useDeleteMonitoringMutation } from '../monitoringApi';
import { liveForgotten } from '../monitoringSlice';

export const useDeleteSession = () => {
  const dispatch = useAppDispatch();
  const [deleteMonitoring, { isLoading }] = useDeleteMonitoringMutation();
  const [failed, setFailed] = useState(false);

  // true once deleted; false when the server couldn't be reached
  const remove = async (id: string): Promise<boolean> => {
    try {
      await deleteMonitoring(id).unwrap();
      dispatch(liveForgotten(id));
      setFailed(false);
      return true;
    } catch {
      setFailed(true);
      return false;
    }
  };

  return { remove, deleting: isLoading, failed };
};
