// src/services/UserApi.ts
import type { Effect } from 'effect'
import { Context } from 'effect'

export interface User {
  readonly id: string
  readonly name: string
  readonly email: string
}

export interface UserApiService {
  readonly getUserById: (id: string) => Effect.Effect<User, Error>
}

export class UserApi extends Context.Tag('UserApi')<
  UserApi,
  UserApiService
>() {}
