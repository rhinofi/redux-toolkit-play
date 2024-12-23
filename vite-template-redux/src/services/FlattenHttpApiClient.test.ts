import { HttpApi } from '@effect/platform'
import {
  HttpApiClient,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from '@effect/platform'
import { Context, DateTime, Effect, Layer, Runtime, Schema } from 'effect'
import { createApiFromEffectTagFactory } from '../app/effect'
import { flattenHttpApiClient } from './FlattenHttpApiClient'
// import { configureStore } from '@reduxjs/toolkit'
import { DefinitionType } from '../app/effect'
// import type { HttpApiDecodeError } from '@effect/platform/Http/api/errors'
// import type { HttpClientError } from '@effect/platform/Http/client/errors'
// import type { RuntimeServices } from '../services/AppLayerLive'

class User extends Schema.Class<User>('User')({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc,
}) {}

// Our user id path parameter schema
const UserIdParam = HttpApiSchema.param('userId', Schema.NumberFromString)

class UsersApi extends HttpApiGroup.make('users').add(
  HttpApiEndpoint.get('findById')`/users/${UserIdParam}`.addSuccess(User),
) {}

class MyApi extends HttpApi.make('myApi').add(UsersApi) {}

describe('FlattenHttpApiClient', () => {
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
        const client = yield* flattenHttpApiClient(httpApiClient)

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

  it('should create a redux api slice from a flattened http api client', async () => {
    const flattenedClientEffect = flattenHttpApiClient(httpApiClient)

    class ApiService extends Context.Tag('ApiService')<
      ApiService,
      Effect.Effect.Success<typeof flattenedClientEffect>
    >() {}

    const AppServiceTags = [ApiService] as const
    type AppServiceTagsTypes = typeof AppServiceTags[number]
    type RuntimeServices = Context.Tag.Identifier<AppServiceTagsTypes>

    const api = createApiFromEffectTagFactory<RuntimeServices>()(
      ApiService,
      {
        reducerPath: 'api',
        tagTypes: ['User'] as const,
      },
      {
        usersFindById: {
          type: DefinitionType.query as const,
        },
        usersFindByIdWithResponse: {
          type: DefinitionType.query as const,
        },
      } as const,
    )

    // Pausing here as requested
  })
})
