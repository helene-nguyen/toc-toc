//~ Driver adapter: HTTP route for sign-up — the new account is signed in at once.
// Structural validation (shape, formats, lengths) lives here in the JSON schema;
// business rules (passwords match, email unique and allowed) live in the use case.
import type { FastifyInstance } from 'fastify';
import type { CreateUserAccount, SignUpError, SignUpInput } from '../../../core/user/createUserAccount.js';
import { issueTokens } from './sessionRoutes.js';

const bodySchema = {
  type: 'object',
  required: ['email', 'password', 'passwordConfirmation'],
  additionalProperties: false,
  properties: {
    // sanity check only — real ownership would need an email verification
    email: { type: 'string', pattern: '^\\s*[^@\\s]+@[^@\\s]+\\.[^@\\s]+\\s*$', maxLength: 255 },
    password: { type: 'string', minLength: 8, maxLength: 128 },
    passwordConfirmation: { type: 'string', maxLength: 128 }
  }
};

const errorStatus: Record<SignUpError, number> = {
  PASSWORDS_DO_NOT_MATCH: 400,
  EMAIL_ALREADY_USED: 409,
  EMAIL_NOT_ALLOWED: 403
};

export const signUpRoute =
  (createUserAccount: CreateUserAccount) =>
  async (app: FastifyInstance): Promise<void> => {
    app.post<{ Body: SignUpInput }>('/api/v1/signup', { schema: { body: bodySchema } }, async (request, reply) => {
      const result = await createUserAccount.handle(request.body);

      if (!result.ok) {
        return reply.status(errorStatus[result.error]).send({ error: result.error });
      }

      issueTokens(app, reply, result.value.id);
      return reply.status(201).send({ user: result.value });
    });
  };
