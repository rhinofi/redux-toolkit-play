import {
  FetchHttpClient,
  HttpApi,
  HttpApiClient,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
} from '@effect/platform'
import { Context, Effect, Layer, Schema } from 'effect'
import { createApiFromEffectTag } from '../app/createApiFromEffectTag'
import { DefinitionType } from '../app/effect'

// here is our api definition
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

// --------------------------------------------
// Implementation
// --------------------------------------------

const make = Effect.gen(function*() {
  const client = yield* HttpApiClient.make(MyApi, {
    baseUrl: 'http://localhost:3000',
  })
  // Check the types of the 2 results below
  const userWithResponce = yield* client.users.findById({
    path: { userId: 1 },
    withResponse: true,
  })
  const user = yield* client.users.findById({ path: { userId: 1 } })

  return client.users
})

type FromHttpApiClientService = Effect.Effect.Success<typeof make>

export class FromHttpApiClient extends Context.Tag('FromHttpApiClient')<
  FromHttpApiClient,
  FromHttpApiClientService
>() {}

export const FromHttpApiClientLive = Layer
  .effect(
    FromHttpApiClient,
    make,
  )
  .pipe(Layer.provide(FetchHttpClient.layer))

const { useFindByIdQuery } = createApiFromEffectTag(
  FromHttpApiClient,
  {
    reducerPath: 'fromHttpApiClient',
  },
  {
    findById: {
      type: DefinitionType.query,
    },
  },
)

// data is a union
// const { data } = useFindByIdQuery({ path: { userId: 1 } })
