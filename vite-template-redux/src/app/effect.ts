import type {
  BaseQueryApi,
  BaseQueryError,
  BaseQueryExtraOptions,
  BaseQueryFn,
  BaseQueryMeta,
  BaseQueryResult,
  CreateApiOptions,
  // DefinitionType,
  MutationExtraOptions,
  QueryExtraOptions,
  QueryReturnValue,
} from '@reduxjs/toolkit/query'
import { _NEVER, createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import { Context, Effect, Either, ManagedRuntime } from 'effect'
import type { DistributiveOmit } from 'react-redux'
import { RuntimeServices } from '../services/AppLayerLive'

/* Copied from RTK Query (@reduxjs/toolkit/query/index.d.ts) */
type IsAny<T, True, False = never> = true | false extends
  (T extends never ? true : false) ? True : False
type CastAny<T, CastTo> = IsAny<T, CastTo, T>
type MaybePromise<T> = T | PromiseLike<T>
type NEVER = typeof _NEVER
/* End copy from RTK Query (@reduxjs/toolkit/query/index.d.ts) */

type EndpointDefinitionWithQueryFn<
  QueryArg,
  BaseQuery extends BaseQueryFn,
  ResultType,
> = {
  queryFn(
    arg: QueryArg,
    api: BaseQueryApi,
    extraOptions: BaseQueryExtraOptions<BaseQuery>,
    baseQuery: (arg: Parameters<BaseQuery>[0]) => ReturnType<BaseQuery>,
  ): MaybePromise<
    QueryReturnValue<
      ResultType,
      BaseQueryError<BaseQuery>,
      BaseQueryMeta<BaseQuery>
    >
  >
  query?: never
  transformResponse?: never
  transformErrorResponse?: never
  structuralSharing?: boolean
}

declare const resultType: unique symbol
declare const baseQuery: unique symbol

type HasRequiredProps<T, True, False> = T extends Required<T> ? True : False

type BaseEndpointDefinitionWithQueryFn<
  QueryArg,
  BaseQuery extends BaseQueryFn,
  ResultType,
> =
  & ([CastAny<BaseQueryResult<BaseQuery>, {}>] extends [NEVER] ? never
    : EndpointDefinitionWithQueryFn<QueryArg, BaseQuery, ResultType>)
  & {
    [resultType]?: ResultType
    [baseQuery]?: BaseQuery
  }
  & HasRequiredProps<BaseQueryExtraOptions<BaseQuery>, {
    extraOptions: BaseQueryExtraOptions<BaseQuery>
  }, {
    extraOptions?: BaseQueryExtraOptions<BaseQuery>
  }>

type QueryDefinitionWithQueryFn<
  QueryArg,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ResultType,
  ReducerPath extends string = string,
> =
  & BaseEndpointDefinitionWithQueryFn<QueryArg, BaseQuery, ResultType>
  & QueryExtraOptions<TagTypes, ResultType, QueryArg, BaseQuery, ReducerPath>
type MutationDefinitionQueryFn<
  QueryArg,
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ResultType,
  ReducerPath extends string = string,
> =
  & BaseEndpointDefinitionWithQueryFn<QueryArg, BaseQuery, ResultType>
  & MutationExtraOptions<TagTypes, ResultType, QueryArg, BaseQuery, ReducerPath>

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

type FakeBaseQuery<ErrorType> = BaseQueryFn<void, typeof _NEVER, ErrorType, {}>

export enum DefinitionType {
  query = 'query',
  mutation = 'mutation',
}

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
    ReducerPath extends string,
    ErrorType extends ExtractErrorTypes<SI>,
    TagTypes extends string,
    EndpointDefs extends {
      [K in MethodKeys<SI>]: DistributiveOmit<
        | QueryDefinitionWithQueryFn<
          Parameters<SI[K]>[0],
          // TODO: why this doesn't work
          // FakeBaseQuery<ErrorType>,
          any,
          TagTypes,
          Effect.Effect.Success<ReturnType<SI[K]>>,
          ReducerPath
        >
        | MutationDefinitionQueryFn<
          Parameters<SI[K]>[0],
          // TODO: why this doesn't work
          // FakeBaseQuery<ErrorType>,
          any,
          TagTypes,
          Effect.Effect.Success<ReturnType<SI[K]>>,
          ReducerPath
        >,
        'queryFn'
      >
    },
  >(
    // Takes a service tag (Context.Tag) and configuration options
    serviceTag: Context.Tag<S, SI>,
    // TODO: allow serializeQueryArgs
    createApiOptions:
      & { reducerPath: ReducerPath }
      & Omit<
        CreateApiOptions<FakeBaseQuery<ErrorType>, any, ReducerPath, TagTypes>,
        'endpoints' | 'reducerPath' | 'baseQuery'
      >,
    endpointConfigs: EndpointDefs,
  ) => {
    // type ErrorType = ExtractErrorTypes<SI>
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
      ...createApiOptions,
      baseQuery: fakeBaseQuery<ErrorType>(),
      // Define the shape of our endpoints using TypeScript generics
      endpoints: (builder): {
        [K in MethodKeys<SI>]: EndpointDefs[K]['type'] extends
          DefinitionType.query ? QueryDefinitionWithQueryFn<
            Parameters<SI[K]>[0],
            // TODO: why this doesn't work
            // FakeBaseQuery<ErrorType>,
            any,
            TagTypes,
            Effect.Effect.Success<ReturnType<SI[K]>>,
            ReducerPath
          >
          : MutationDefinitionQueryFn<
            Parameters<SI[K]>[0],
            // TODO: why this doesn't work
            // FakeBaseQuery<ErrorType>,
            any,
            TagTypes,
            Effect.Effect.Success<ReturnType<SI[K]>>,
            ReducerPath
          >
      } => {
        // Initialize empty endpoints object
        const endpoints = {} as Record<MethodKeys<SI>, any>
        // Get all method keys from options, excluding 'reducerPath'
        const methodKeys = Object.keys(endpointConfigs) as Array<MethodKeys<SI>>

        // Struct.keys
        // Iterate through each method to create corresponding endpoints
        methodKeys.forEach(methodKey => {
          type ResultType = Effect.Effect.Success<ReturnType<typeof method>>
          type QueryType = Parameters<typeof method>[0]

          // Get the configuration for this method from options
          const config = endpointConfigs[methodKey]

          // Get the actual method from the service tag
          const method = (serviceTag as any)[methodKey] as SI[typeof methodKey]

          // Create either a query or mutation endpoint based on config.type
          if (config.type === 'query') {
            endpoints[methodKey] = builder.query<ResultType, QueryType>({
              // we can simply do this since
              // ...config,
              ...(config.forceRefetch !== undefined
                ? { extraOptions: config.forceRefetch }
                : {}),
              // ...(config.invalidatesTags !== undefined ? { extraOptions: config.invalidatesTags } : {}),
              ...(config.keepUnusedDataFor !== undefined
                ? { extraOptions: config.keepUnusedDataFor }
                : {}),
              ...(config.merge !== undefined ? { merge: config.merge } : {}),
              ...(config.onCacheEntryAdded !== undefined
                ? { extraOptions: config.onCacheEntryAdded }
                : {}),
              ...(config.onQueryStarted !== undefined
                ? { extraOptions: config.onQueryStarted }
                : {}),
              ...(config.providesTags !== undefined
                ? { extraOptions: config.providesTags }
                : {}),
              ...(config.serializeQueryArgs !== undefined
                ? { extraOptions: config.serializeQueryArgs }
                : {}),
              ...(config.structuralSharing !== undefined
                ? { extraOptions: config.structuralSharing }
                : {}),
              ...(config.extraOptions != null
                ? { extraOptions: config.extraOptions }
                : {}),
              // ...(config.transformResponse !== undefined ? { extraOptions: config.transformResponse } : {}),
              // ...(config.transformErrorResponse !== undefined ? { extraOptions: config.transformErrorResponse } : {}),
              // ...(config.query !== undefined ? { query: config.query } : {}),
              queryFn: createQueryFn(methodKey),
            })
          } else if (config.type === 'mutation') {
            endpoints[methodKey] = builder.mutation<ResultType, QueryType>({
              // ...(config.forceRefetch !== undefined ? { extraOptions: config.forceRefetch } : {}),
              ...(config.invalidatesTags !== undefined
                ? { extraOptions: config.invalidatesTags }
                : {}),
              // ...(config.keepUnusedDataFor !== undefined ? { extraOptions: config.keepUnusedDataFor } : {}),
              // ...(config.merge !== undefined ? { merge: config.merge } : {}),
              ...(config.onCacheEntryAdded !== undefined
                ? { extraOptions: config.onCacheEntryAdded }
                : {}),
              ...(config.onQueryStarted !== undefined
                ? { extraOptions: config.onQueryStarted }
                : {}),
              // ...(config.providesTags !== undefined ? { extraOptions: config.providesTags } : {}),
              // ...(config.serializeQueryArgs !== undefined ? { extraOptions: config.serializeQueryArgs } : {}),
              ...(config.structuralSharing !== undefined
                ? { extraOptions: config.structuralSharing }
                : {}),
              ...(config.extraOptions != null
                ? { extraOptions: config.extraOptions }
                : {}),
              ...(config.transformResponse !== undefined
                ? { extraOptions: config.transformResponse }
                : {}),
              ...(config.transformErrorResponse !== undefined
                ? { extraOptions: config.transformErrorResponse }
                : {}),
              // ...(config.query !== undefined ? { query: config.query } : {}),
              queryFn: createQueryFn(methodKey),
            })
          } else {
            throw new Error(`Invalid method type: ${(config as any).type}`)
          }
        })

        // Return the populated endpoints object
        return endpoints
      },
    })

    return api
  }

// TODO: move this to app/store ?
export const createApiFromEffectTag = createApiFromEffectTagFactory<
  RuntimeServices
>()
