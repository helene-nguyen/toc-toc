//~ Import modules
import { loadEnvFile } from 'node:process';
import { buildApp } from './app.js';
import { createPool, dbConfig } from './db.js';
import { runMigrations } from './migrations.js';
import { StartMonitoring } from './core/monitoring/startMonitoring.js';
import { StopMonitoring } from './core/monitoring/stopMonitoring.js';
import { GetMonitoring } from './core/monitoring/getMonitoring.js';
import { ListMonitorings } from './core/monitoring/listMonitorings.js';
import { DeleteMonitoring } from './core/monitoring/deleteMonitoring.js';
import { SaveContraction } from './core/monitoring/saveContraction.js';
import { RemoveContraction } from './core/monitoring/removeContraction.js';
import { RecordMovement } from './core/monitoring/recordMovement.js';
import { RemoveMovement } from './core/monitoring/removeMovement.js';
import { PostgresMonitoringRepository } from './adapters/postgres/monitoringRepository.js';
import { SystemClock } from './adapters/systemClock.js';

//~ Load environment (optional — db.ts falls back to the dev defaults)
try {
  loadEnvFile();
} catch {
  // no .env file yet — defaults apply
}

//~ The Docker image migrates on start, so updating the Pi is just pulling a new image
if (process.env.RUN_MIGRATIONS === 'true') {
  await runMigrations(dbConfig());
}

//~ Composition root: build every adapter and use case here, inject them, launch
const PORT = Number(process.env.PORT ?? 4210);

const pool = createPool();
const clock = new SystemClock();
const monitorings = new PostgresMonitoringRepository(pool);

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
  webDir: process.env.WEB_DIR,
  pool
});

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
