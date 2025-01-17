import type { HttpApiError, HttpClientError } from '@effect/platform'
import {
  HttpApi,
  HttpApiClient,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  HttpClient,
  HttpClientRequest,
} from '@effect/platform'
import type { HttpClientResponse } from '@effect/platform/HttpClientResponse'
import { Effect, Schema } from 'effect'
import { describe, expectTypeOf, it } from 'vitest'
import { flattenHttpApiClient } from './flattenHttpApiClient.js'

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

class OtherResponse extends Schema.Class<OtherResponse>('OtherResponse')({
  prop: Schema.Number,
}) {}

class OtherPayload extends Schema.Class<OtherPayload>('OtherPayload')({
  prop: Schema.String,
}) {}

class OtherError extends Schema.Class<OtherError>('OtherError')({
  error: Schema.String,
}) {}

class OtherGroup extends HttpApiGroup.make('other').add(
  HttpApiEndpoint.post('findAll')`/other`
    .setPayload(OtherPayload)
    .addSuccess(OtherResponse)
    .addError(OtherError),
) {}

class MyApi extends HttpApi
  .make('myApi')
  .add(UsersApi)
  .add(OtherGroup)
{}

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
    const flattened = Effect.map(httpApiClient, flattenHttpApiClient)

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
    expectTypeOf<FindByIdError>().toMatchTypeOf<
      | HttpClientError.HttpClientError
      | HttpApiError.HttpApiDecodeError
      | NotFoundError
    >()
    expectTypeOf<FindByIdWithResponseError>()
      .toMatchTypeOf<
        | HttpApiError.HttpApiDecodeError
        | HttpClientError.HttpClientError
        | NotFoundError
      >()

    type OtherFindAllMethod = FlattenedApi['otherFindAll']
    type OtherFindAllWithResponseMethod =
      FlattenedApi['otherFindAllWithResponse']

    // Test parameter types
    type OtherFindAllParams = Parameters<OtherFindAllMethod>[0]
    type OtherFindAllWithResponseParams = Parameters<
      OtherFindAllWithResponseMethod
    >[0]

    // Assert parameter types
    expectTypeOf<OtherFindAllParams>().toMatchTypeOf<{
      payload: { prop: string }
    }>()

    expectTypeOf<OtherFindAllWithResponseParams>().toMatchTypeOf<{
      payload: { prop: string }
    }>()

    // Test return types
    type OtherFindAllEffect = ReturnType<OtherFindAllMethod>
    type OtherFindAllWithResponseEffect = ReturnType<
      OtherFindAllWithResponseMethod
    >

    // Assert success types
    expectTypeOf<Effect.Effect.Success<OtherFindAllEffect>>().toEqualTypeOf<
      OtherResponse
    >()
    expectTypeOf<Effect.Effect.Success<OtherFindAllWithResponseEffect>>()
      .toEqualTypeOf<[OtherResponse, HttpClientResponse]>()

    // Test error types
    type OtherFindAllError = Effect.Effect.Error<OtherFindAllEffect>
    type OtherFindAllWithResponseError = Effect.Effect.Error<
      OtherFindAllWithResponseEffect
    >

    // Assert error types
    expectTypeOf<OtherFindAllError>().toMatchTypeOf<
      | HttpClientError.HttpClientError
      | HttpApiError.HttpApiDecodeError
      | OtherError
    >()

    expectTypeOf<OtherFindAllWithResponseError>().toMatchTypeOf<
      | HttpApiError.HttpApiDecodeError
      | HttpClientError.HttpClientError
      | OtherError
    >()

    expectTypeOf<keyof FlattenedApi>().toEqualTypeOf<
      | 'usersFindById'
      | 'usersFindByIdWithResponse'
      | 'otherFindAll'
      | 'otherFindAllWithResponse'
    >()
  })
})
