import { HttpApi } from '@effect/platform'
import type { HttpApiError, HttpClientError } from '@effect/platform'
import {
  HttpApiClient,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  HttpClient,
  HttpClientRequest,
} from '@effect/platform'
import type { HttpClientResponse } from '@effect/platform/HttpClientResponse'
import { Schema } from 'effect'
import type { Effect } from 'effect'
import { describe, expectTypeOf, it } from 'vitest'
import { flattenHttpApiClient } from './flattenHttpApiClient'

class User extends Schema.Class<User>('User')({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc,
}) {}

class NotFoundError extends Schema.Class<NotFoundError>('NotFoundError')({
  message: Schema.String,
  userId: Schema.Number,
}) {}

// User id path parameter schema
const UserIdParam = HttpApiSchema.param('userId', Schema.NumberFromString)

class UsersApi extends HttpApiGroup.make('users').add(
  HttpApiEndpoint.get('findById')`/users/${UserIdParam}`
    .addSuccess(User)
    .addError(NotFoundError),
) {}

class MyApi extends HttpApi.make('myApi').add(UsersApi) {}

describe('flattenHttpApiClient', () => {
  it('creates flattened API with correct types', () => {
    // Create API client
    const httpApiClient = HttpApiClient.make(MyApi, {
      baseUrl: 'http://localhost:3000',
      transformClient: client =>
        client.pipe(
          HttpClient.mapRequest(HttpClientRequest.bearerToken('1234567890')),
        ),
    })

    // Get flattened client
    const flattened = flattenHttpApiClient(httpApiClient)

    // Test the type structure
    type FlattenedApi = Effect.Effect.Success<typeof flattened>
    type FindByIdMethod = FlattenedApi['usersFindById']
    type FindByIdWithResponseMethod = FlattenedApi['usersFindByIdWithResponse']

    // Test parameter types
    type FindByIdParams = Parameters<FindByIdMethod>[0]
    type FindByIdWithResponseParams = Parameters<FindByIdWithResponseMethod>[0]

    // Assert parameter types
    expectTypeOf<FindByIdParams>().toMatchTypeOf<{
      path: { userId: number }
    }>()

    expectTypeOf<FindByIdWithResponseParams>().toMatchTypeOf<{
      path: { userId: number }
    }>()

    // Test return types
    type FindByIdEffect = ReturnType<FindByIdMethod>
    type FindByIdWithResponseEffect = ReturnType<FindByIdWithResponseMethod>

    // Assert success types
    expectTypeOf<Effect.Effect.Success<FindByIdEffect>>().toEqualTypeOf<User>()
    expectTypeOf<Effect.Effect.Success<FindByIdWithResponseEffect>>()
      .toEqualTypeOf<[User, HttpClientResponse]>()

    // Test error types
    type FindByIdError = Effect.Effect.Error<FindByIdEffect>
    type FindByIdWithResponseError = Effect.Effect.Error<
      FindByIdWithResponseEffect
    >

    // Assert error types
    expectTypeOf<Effect.Effect.Error<FindByIdEffect>>().toMatchTypeOf<
      | HttpClientError.HttpClientError
      | HttpApiError.HttpApiDecodeError
      | NotFoundError
    >()
    expectTypeOf<Effect.Effect.Error<FindByIdWithResponseEffect>>()
      .toMatchTypeOf<
        | NotFoundError
        | HttpApiError.HttpApiDecodeError
        | HttpClientError.HttpClientError
      >()
  })
})
