// src/services/UserApiTest.ts
import { Effect, Layer } from 'effect'
import { UserApi } from './UserApi'
import type { User, UserApiService } from './UserApi'

const defaultTestUser: User = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
}

export const defaultTestImpl: UserApiService = {
  getUserById: (id: string) => Effect.succeed({ ...defaultTestUser, id }),
}

export const UserApiTest = Layer.succeed(
  UserApi,
  UserApi.of(defaultTestImpl),
)
