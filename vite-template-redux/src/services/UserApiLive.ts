// src/services/UserApiLive.ts
import { Layer, Effect } from 'effect';
import type { User } from './UserApi';
import { UserApi } from './UserApi';

export const UserApiLive = Layer.succeed(
  UserApi,
  UserApi.of({
    getUserById: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const response = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`);
          if (!response.ok) throw new Error ('Failed to fetch user');
          return response.json() as Promise<User>;
        },
        catch: (error) => error as Error,
      }),
  })
);