//~ Monitoring routes — the history, one monitoring, and every tap made
// during it. Taps use PUT with an id made by the phone: the offline queue may
// send the same request twice, and PUT lands it once. Everything is scoped to
// the signed-in user from the access-token cookie.
import type { FastifyInstance } from 'fastify';
import type { StartMonitoring } from '../../../core/monitoring/startMonitoring.js';
import type { StopMonitoring } from '../../../core/monitoring/stopMonitoring.js';
import type { GetMonitoring } from '../../../core/monitoring/getMonitoring.js';
import type { ListMonitorings } from '../../../core/monitoring/listMonitorings.js';
import type { DeleteMonitoring } from '../../../core/monitoring/deleteMonitoring.js';
import type { SaveContraction } from '../../../core/monitoring/saveContraction.js';
import type { RemoveContraction } from '../../../core/monitoring/removeContraction.js';
import type { RecordMovement } from '../../../core/monitoring/recordMovement.js';
import type { RemoveMovement } from '../../../core/monitoring/removeMovement.js';
import type { Intensity } from '../../../core/monitoring/ports.js';

//~ One bundle for all monitoring use cases
export interface MonitoringUseCases {
  startMonitoring: StartMonitoring;
  stopMonitoring: StopMonitoring;
  getMonitoring: GetMonitoring;
  listMonitorings: ListMonitorings;
  deleteMonitoring: DeleteMonitoring;
  saveContraction: SaveContraction;
  removeContraction: RemoveContraction;
  recordMovement: RecordMovement;
  removeMovement: RemoveMovement;
}

//~ The core names errors; HTTP decides the status: what isn't there is a 404,
// a clash with what is already recorded a 409, a time that makes no sense a 400
const CONFLICTS = ['MONITORING_ALREADY_RUNNING', 'MONITORING_STOPPED', 'CONTRACTION_IN_PROGRESS', 'CONTRACTIONS_OVERLAP'];
const statusFor = (error: string) => (error.endsWith('NOT_FOUND') ? 404 : CONFLICTS.includes(error) ? 409 : 400);

const uuid = { type: 'string', format: 'uuid' };
const dateTime = { type: 'string', format: 'date-time' };

const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: uuid }
};

interface IdParams {
  id: string;
}

const eventParamsSchema = {
  type: 'object',
  required: ['id', 'eventId'],
  properties: { id: uuid, eventId: uuid }
};

interface EventParams {
  id: string;
  eventId: string;
}

const startBodySchema = {
  type: 'object',
  required: ['id', 'startedAt'],
  additionalProperties: false,
  properties: { id: uuid, startedAt: dateTime }
};

interface StartBody {
  id: string;
  startedAt: string;
}

const stopBodySchema = {
  type: 'object',
  required: ['stoppedAt'],
  additionalProperties: false,
  properties: { stoppedAt: dateTime }
};

interface StopBody {
  stoppedAt: string;
}

//~ The whole contraction, every time (endedAt null = still going on).
// braxtonHicks may be missing: phones still running an older app version
// don't send it, and their contractions are labour ones
const contractionBodySchema = {
  type: 'object',
  required: ['startedAt', 'endedAt', 'intensity'],
  additionalProperties: false,
  properties: {
    startedAt: dateTime,
    endedAt: { type: ['string', 'null'], format: 'date-time' },
    intensity: { type: 'integer', enum: [1, 2, 3] },
    braxtonHicks: { type: 'boolean' }
  }
};

interface ContractionBody {
  startedAt: string;
  endedAt: string | null;
  intensity: Intensity;
  braxtonHicks?: boolean;
}

const movementBodySchema = {
  type: 'object',
  required: ['at'],
  additionalProperties: false,
  properties: { at: dateTime }
};

interface MovementBody {
  at: string;
}

export const monitoringRoutes =
  ({
    startMonitoring,
    stopMonitoring,
    getMonitoring,
    listMonitorings,
    deleteMonitoring,
    saveContraction,
    removeContraction,
    recordMovement,
    removeMovement
  }: MonitoringUseCases) =>
  async (app: FastifyInstance) => {
    app.get('/api/v1/monitorings', { preHandler: [app.authenticate] }, async (request) => ({
      monitorings: await listMonitorings.handle(request.user.sub)
    }));

    app.post<{ Body: StartBody }>(
      '/api/v1/monitorings',
      { preHandler: [app.authenticate], schema: { body: startBodySchema } },
      async (request, reply) => {
        const result = await startMonitoring.handle({
          userId: request.user.sub,
          id: request.body.id,
          startedAt: new Date(request.body.startedAt)
        });

        if (!result.ok) {
          return reply.code(statusFor(result.error)).send({ error: result.error });
        }

        return reply.code(201).send({ monitoring: result.value });
      }
    );

    app.get<{ Params: IdParams }>(
      '/api/v1/monitorings/:id',
      { preHandler: [app.authenticate], schema: { params: idParamsSchema } },
      async (request, reply) => {
        const result = await getMonitoring.handle(request.params.id, request.user.sub);

        if (!result.ok) {
          return reply.code(statusFor(result.error)).send({ error: result.error });
        }

        return { monitoring: result.value };
      }
    );

    app.post<{ Params: IdParams; Body: StopBody }>(
      '/api/v1/monitorings/:id/stop',
      { preHandler: [app.authenticate], schema: { params: idParamsSchema, body: stopBodySchema } },
      async (request, reply) => {
        const result = await stopMonitoring.handle(
          request.params.id,
          request.user.sub,
          new Date(request.body.stoppedAt)
        );

        if (!result.ok) {
          return reply.code(statusFor(result.error)).send({ error: result.error });
        }

        return { monitoring: result.value };
      }
    );

    app.delete<{ Params: IdParams }>(
      '/api/v1/monitorings/:id',
      { preHandler: [app.authenticate], schema: { params: idParamsSchema } },
      async (request, reply) => {
        const result = await deleteMonitoring.handle(request.params.id, request.user.sub);

        if (!result.ok) {
          return reply.code(statusFor(result.error)).send({ error: result.error });
        }

        return reply.code(204).send();
      }
    );

    app.put<{ Params: EventParams; Body: ContractionBody }>(
      '/api/v1/monitorings/:id/contractions/:eventId',
      { preHandler: [app.authenticate], schema: { params: eventParamsSchema, body: contractionBodySchema } },
      async (request, reply) => {
        const { startedAt, endedAt, intensity, braxtonHicks = false } = request.body;
        const result = await saveContraction.handle(request.params.id, request.user.sub, {
          id: request.params.eventId,
          startedAt: new Date(startedAt),
          endedAt: endedAt === null ? null : new Date(endedAt),
          intensity,
          braxtonHicks
        });

        if (!result.ok) {
          return reply.code(statusFor(result.error)).send({ error: result.error });
        }

        return { contraction: result.value };
      }
    );

    app.delete<{ Params: EventParams }>(
      '/api/v1/monitorings/:id/contractions/:eventId',
      { preHandler: [app.authenticate], schema: { params: eventParamsSchema } },
      async (request, reply) => {
        const result = await removeContraction.handle(request.params.id, request.user.sub, request.params.eventId);

        if (!result.ok) {
          return reply.code(statusFor(result.error)).send({ error: result.error });
        }

        return reply.code(204).send();
      }
    );

    app.put<{ Params: EventParams; Body: MovementBody }>(
      '/api/v1/monitorings/:id/movements/:eventId',
      { preHandler: [app.authenticate], schema: { params: eventParamsSchema, body: movementBodySchema } },
      async (request, reply) => {
        const result = await recordMovement.handle(request.params.id, request.user.sub, {
          id: request.params.eventId,
          at: new Date(request.body.at)
        });

        if (!result.ok) {
          return reply.code(statusFor(result.error)).send({ error: result.error });
        }

        return { movement: result.value };
      }
    );

    app.delete<{ Params: EventParams }>(
      '/api/v1/monitorings/:id/movements/:eventId',
      { preHandler: [app.authenticate], schema: { params: eventParamsSchema } },
      async (request, reply) => {
        const result = await removeMovement.handle(request.params.id, request.user.sub, request.params.eventId);

        if (!result.ok) {
          return reply.code(statusFor(result.error)).send({ error: result.error });
        }

        return reply.code(204).send();
      }
    );
  };
