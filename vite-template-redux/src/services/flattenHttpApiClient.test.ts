import {
  HttpApi,
  HttpApiClient,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from '@effect/platform'
import { Context, DateTime, Effect, Layer, Runtime, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  createApiFromEffectTagFactory,
  DefinitionType,
} from '../app/createApiFromEffectTagFactory.js'
import { flattenHttpApiClient } from './flattenHttpApiClient.js'

class User extends Schema.Class<User>('User')({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc,
}) {}

// User id path parameter schema
const UserIdParam = HttpApiSchema.param('userId', Schema.NumberFromString)

class UsersApi extends HttpApiGroup
  .make('users')
  .add(
    HttpApiEndpoint.get('findById')`/users/${UserIdParam}`.addSuccess(User),
  )
  .add(
    HttpApiEndpoint
      .post('update')`/users/${UserIdParam}`
      .setPayload(Schema.Struct({ name: Schema.String }))
      .addSuccess(User),
  )
{}

class MyApi extends HttpApi.make('myApi').add(UsersApi) {}

describe('flattenHttpApiClient', () => {
  const mockUser = new User({
    id: 1,
    name: 'John Doe',
    createdAt: DateTime.unsafeNow(),
  })

  // Create a mock HttpClient that returns our mock user
  const mockHttpClient = HttpClient.make(request => {
    expect(request.headers['authorization']).toBe('Bearer 1234567890')

    return Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        new Response(
          JSON.stringify(mockUser),
          {
            status: 200,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    )
  })

  // Create the real HttpApiClient but provide it with our mock HttpClient
  const httpApiClient = HttpApiClient.make(MyApi, {
    baseUrl: 'http://localhost:3000',
    transformClient: client =>
      client.pipe(
        HttpClient.mapRequest(HttpClientRequest.bearerToken('1234567890')),
      ),
  })

  // Create a runtime for the test
  const runtime = Effect.runSync(Effect.runtime<never>())

  it('should flatten the HttpApiClient', async () => {
    const effect = Effect
      .gen(function*() {
        const client = flattenHttpApiClient(yield* httpApiClient)

        // Test regular endpoint
        const user = yield* client.usersFindById({ path: { userId: 1 } })
        expect(user).toBeInstanceOf(User)
        expect(user).toEqual(mockUser)

        // Test withResponse endpoint
        const [userWithResponse, response] = yield* client
          .usersFindByIdWithResponse({
            path: { userId: 1 },
          })
        expect(userWithResponse).toBeInstanceOf(User)
        expect(userWithResponse).toEqual(mockUser)

        expect(response).toEqual(expect.objectContaining({
          status: 200,
          headers: expect.any(Object),
        }))
      })
      .pipe(
        Effect.scoped,
        Effect.provide(Layer.succeed(HttpClient.HttpClient, mockHttpClient)),
        Effect.tapErrorCause(cause => Effect.logError(cause)),
      )

    await Runtime.runPromise(runtime)(effect)
  })

  it('should create a redux api slice from a flattened http api client', () => {
    const flattenedClientEffect = Effect.map(
      httpApiClient,
      flattenHttpApiClient,
    )

    class ApiService extends Context.Tag('ApiService')<
      ApiService,
      Effect.Effect.Success<typeof flattenedClientEffect>
    >() {}

    const AppServiceTags = [ApiService] as const
    type AppServiceTagsTypes = typeof AppServiceTags[number]
    type RuntimeServices = Context.Tag.Identifier<AppServiceTagsTypes>

    createApiFromEffectTagFactory<RuntimeServices>()(
      ApiService,
      {
        reducerPath: 'api',
        tagTypes: ['User'],
      },
      {
        usersFindById: {
          type: DefinitionType.query,
        },
        usersFindByIdWithResponse: {
          type: DefinitionType.query,
        },
        usersUpdate: {
          type: DefinitionType.mutation,
        },
      },
    )
  })

  it('should allow a developer to easily mock the flattened http api client', async () => {
    const flattenedClientEffect = Effect.map(
      httpApiClient,
      flattenHttpApiClient,
    )
    const updatedUser = new User({
      id: 1,
      name: 'Jane Doe',
      createdAt: DateTime.unsafeNow(),
    })

    const mockedClient = flattenedClientEffect.pipe(
      Effect.map(client => ({
        ...client,
        usersFindById: (_: Parameters<typeof client.usersFindById>[0]) =>
          Effect.succeed(mockUser),
        usersFindByIdWithResponse: (
          _: Parameters<typeof client.usersFindByIdWithResponse>[0],
        ) => Effect.succeed([mockUser, new Response()]),
        usersUpdate: (_: Parameters<typeof client.usersUpdate>[0]) =>
          Effect.succeed(updatedUser),
      })),
    )

    const program = Effect
      .gen(function*() {
        const client = yield* mockedClient

        const user = yield* client.usersFindById({ path: { userId: 1 } })
        expect(user).toBeInstanceOf(User)
        expect(user).toEqual(mockUser)

        const updatedUser = yield* client.usersUpdate({
          path: { userId: 1 },
          payload: { name: 'Jane Doe' },
        })
        expect(updatedUser).toBeInstanceOf(User)
        expect(updatedUser).toEqual(updatedUser)
      })
      .pipe(
        Effect.scoped,
        Effect.provide(Layer.succeed(HttpClient.HttpClient, mockHttpClient)),
      )

    await Runtime.runPromise(runtime)(program)
  })
})
