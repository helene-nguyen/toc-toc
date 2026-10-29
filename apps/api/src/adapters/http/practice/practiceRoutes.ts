//~ Practice contraction routes — the "Préparation" tab: the history, and
// recording or removing a contraction outside any monitoring. Taps use PUT
// with an id made by the phone, like monitoring taps. Everything is scoped
// to the signed-in user.
import type { FastifyInstance } from 'fastify';
import type { SavePracticeContraction } from '../../../core/practice/savePracticeContraction.js';
import type { RemovePracticeContraction } from '../../../core/practice/removePracticeContraction.js';
import type { ListPracticeHistory } from '../../../core/practice/listPracticeHistory.js';

export interface PracticeUseCases {
  savePracticeContraction: SavePracticeContraction;
  removePracticeContraction: RemovePracticeContraction;
  listPracticeHistory: ListPracticeHistory;
}

//~ Same mapping as the monitoring routes
const statusFor = (error: string) =>
  error.endsWith('NOT_FOUND') ? 404 : error === 'CONTRACTION_IN_PROGRESS' ? 409 : 400;

const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', format: 'uuid' } }
};

interface IdParams {
  id: string;
}

const bodySchema = {
  type: 'object',
  required: ['startedAt', 'endedAt'],
  additionalProperties: false,
  properties: {
    startedAt: { type: 'string', format: 'date-time' },
    endedAt: { type: ['string', 'null'], format: 'date-time' }
  }
};

interface PracticeBody {
  startedAt: string;
  endedAt: string | null;
}

export const practiceRoutes =
  ({ savePracticeContraction, removePracticeContraction, listPracticeHistory }: PracticeUseCases) =>
  async (app: FastifyInstance) => {
    app.get('/api/v1/practice-contractions', { preHandler: [app.authenticate] }, async (request) => ({
      contractions: await listPracticeHistory.handle(request.user.sub)
    }));

    app.put<{ Params: IdParams; Body: PracticeBody }>(
      '/api/v1/practice-contractions/:id',
      { preHandler: [app.authenticate], schema: { params: idParamsSchema, body: bodySchema } },
      async (request, reply) => {
        const { startedAt, endedAt } = request.body;
        const result = await savePracticeContraction.handle(request.user.sub, {
          id: request.params.id,
          startedAt: new Date(startedAt),
          endedAt: endedAt === null ? null : new Date(endedAt)
        });

        if (!result.ok) {
          return reply.code(statusFor(result.error)).send({ error: result.error });
        }

        return { contraction: result.value };
      }
    );

    app.delete<{ Params: IdParams }>(
      '/api/v1/practice-contractions/:id',
      { preHandler: [app.authenticate], schema: { params: idParamsSchema } },
      async (request, reply) => {
        const result = await removePracticeContraction.handle(request.params.id, request.user.sub);

        if (!result.ok) {
          return reply.code(statusFor(result.error)).send({ error: result.error });
        }

        return reply.code(204).send();
      }
    );
  };
