//~ One place to wire the whole app with fakes for route tests.
import { buildApp } from '../app.js';
import { StartMonitoring } from '../core/monitoring/startMonitoring.js';
import { StopMonitoring } from '../core/monitoring/stopMonitoring.js';
import { GetMonitoring } from '../core/monitoring/getMonitoring.js';
import { ListMonitorings } from '../core/monitoring/listMonitorings.js';
import { DeleteMonitoring } from '../core/monitoring/deleteMonitoring.js';
import { SaveContraction } from '../core/monitoring/saveContraction.js';
import { RemoveContraction } from '../core/monitoring/removeContraction.js';
import { RecordMovement } from '../core/monitoring/recordMovement.js';
import { RemoveMovement } from '../core/monitoring/removeMovement.js';
import { FakeClock, InMemoryMonitoringRepository, at } from './fakes.js';

export const buildTestApp = ({ webDir }: { webDir?: string } = {}) => {
  const clock = new FakeClock(at(60));
  const monitorings = new InMemoryMonitoringRepository();

  const app = buildApp({
    monitoring: {
      startMonitoring: new StartMonitoring(monitorings, clock),
      stopMonitoring: new StopMonitoring(monitorings, clock),
      getMonitoring: new GetMonitoring(monitorings),
      listMonitorings: new ListMonitorings(monitorings),
      deleteMonitoring: new DeleteMonitoring(monitorings),
      saveContraction: new SaveContraction(monitorings, clock),
      removeContraction: new RemoveContraction(monitorings),
      recordMovement: new RecordMovement(monitorings, clock),
      removeMovement: new RemoveMovement(monitorings)
    },
    webDir
  });

  return { app, clock, monitorings };
};
