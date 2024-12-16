import type { BaseQueryApi } from '@reduxjs/toolkit/query'
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import { Context, Effect, Either, ManagedRuntime } from 'effect'
import type { ThunkExtraArgument } from '../app/store'
import { RuntimeServices } from '../services/AppLayerLive'

// Helper type that extracts method names (as strings) from a service interface
type MethodKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? (K extends string ? K : never)
    : never
}[keyof T]

// Helper type that extracts all possible error types from service methods
type ExtractErrorTypes<S> = {
  [K in keyof S]: S[K] extends
    (...args: any[]) => Effect.Effect<any, infer E, any> ? E : never
}[keyof S]

export class ReduxState extends Context.Tag('ReduxState')<
  ReduxState,
  unknown
>() {}

// Main function that creates an RTK Query API from an Effect Layer
export const createApiFromEffectTagFactory =
  <Services, RuntimeCreationError = never>() =>
  <
    S extends Services,
    SI extends {
      [K in keyof SI]: (
        ...args: any[]
      ) => Effect.Effect<any, any, Services | ReduxState>
    },
  >(
    // Takes a service tag (Context.Tag) and configuration options
    serviceTag: Context.Tag<S, SI>,
    options:
      & {
        reducerPath: string
      }
      & {
        // For each method, specify if it's a query or mutation and optional cache tags
        [K in MethodKeys<SI>]: {
          type: 'query' | 'mutation'
          providesTags?: string[]
          invalidatesTags?: string[]
        }
      },
  ) => {
    type ErrorType = ExtractErrorTypes<SI>
    type Runtime = ManagedRuntime.ManagedRuntime<Services, RuntimeCreationError>

    // Helper function to create a queryFn for RTK Query endpoints
    const createQueryFn = (methodKey: keyof SI) => {
      // method is used for typing purposes, not for runtime
      const method = (serviceTag as any)[methodKey] as SI[typeof methodKey]

      return async (args: Parameters<typeof method>[0], api: BaseQueryApi) => {
        const effect = Effect
          .gen(function*() {
            const service = yield* serviceTag
            return yield* service[methodKey](args)
          })
          .pipe(
            Effect.provideService(ReduxState, api.getState()),
            Effect.either,
          )
        const { extra } = api as { extra: { runtime: Runtime } }
        const resultEither = await extra.runtime.runPromise(effect, {
          signal: api.signal,
        })
        if (Either.isLeft(resultEither)) {
          return { error: resultEither.left as ErrorType }
        }
        return { data: resultEither.right }
      }
    }

    const api = createApi({
      reducerPath: options.reducerPath,
      baseQuery: fakeBaseQuery<ErrorType>(),
      // Define the shape of our endpoints using TypeScript generics
      endpoints: (builder): {
        [K in MethodKeys<SI>]: ReturnType<
          typeof builder.query<
            Effect.Effect.Success<ReturnType<SI[K]>>, // Success type from Effect
            Parameters<SI[K]>[0] // Input parameters type
          >
        >
      } => {
        // Initialize empty endpoints object
        const endpoints = {} as Record<string, any>
        // Get all method keys from options, excluding 'reducerPath'
        const methodKeys = Object.keys(options).filter(key =>
          key !== 'reducerPath'
        ) as Array<MethodKeys<SI>>

        // Iterate through each method to create corresponding endpoints
        methodKeys.forEach(methodKey => {
          // Get the configuration for this method from options
          const config = options[methodKey]
          // Get the actual method from the service tag
          const method = (serviceTag as any)[methodKey] as SI[typeof methodKey]

          // Create either a query or mutation endpoint based on config.type
          if (config.type === 'query') {
            endpoints[methodKey] = builder.query<
              Effect.Effect.Success<ReturnType<typeof method>>, // Success type
              Parameters<typeof method>[0] // Input type
            >({
              queryFn: createQueryFn(methodKey),
            })
          } else if (config.type === 'mutation') {
            endpoints[methodKey] = builder.mutation<
              Effect.Effect.Success<ReturnType<typeof method>>, // Success type
              Parameters<typeof method>[0] // Input type
            >({
              queryFn: createQueryFn(methodKey),
            })
          } else {
            throw new Error(`Invalid method type: ${config.type}`)
          }
        })

        // Return the populated endpoints object
        return endpoints as any
      },
    })

    return api
  }

// TODO: move this to app/store ?
export const createApiFromEffectTag = createApiFromEffectTagFactory<
  RuntimeServices
>()
