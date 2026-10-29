//~ Use case: the signed-in person, for the app's header.
import { err, ok, type Result } from '../result.js';
import type { UserAccount, UserAccountRepository } from './ports.js';

export class GetUser {
  constructor(private readonly users: UserAccountRepository) {}

  // USER_NOT_FOUND: the token outlived its account
  handle = async (id: number): Promise<Result<UserAccount, 'USER_NOT_FOUND'>> => {
    const user = await this.users.findById(id);
    return user ? ok(user) : err('USER_NOT_FOUND');
  };
}
