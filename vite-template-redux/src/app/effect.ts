import type {
  BaseQueryApi,
  BaseQueryError,
  BaseQueryExtraOptions,
  BaseQueryFn,
  BaseQueryMeta,
  CreateApiOptions,
  MutationExtraOptions,
  QueryExtraOptions,
  QueryReturnValue,
} from '@reduxjs/toolkit/query'
import { _NEVER, createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import { Context, Effect, Either, ManagedRuntime } from 'effect'
import type { DistributiveOmit } from 'react-redux'

/* Copied from RTK Query (@reduxjs/toolkit/query/index.d.ts) */
type MaybePromise<T> = T | PromiseLike<T>
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

type BaseEndpointDefinitionWithQueryFn<
  QueryArg,
  BaseQuery extends BaseQueryFn,
  ResultType,
> =
  & EndpointDefinitionWithQueryFn<QueryArg, BaseQuery, ResultType>
  & {
    [resultType]?: ResultType
    [baseQuery]?: BaseQuery
  }
  & {
    extraOptions?: BaseQueryExtraOptions<BaseQuery>
  }

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

type FakeBaseQuery<ErrorType> = BaseQueryFn<void, typeof _NEVER, ErrorType, {}>

export enum DefinitionType {
  query = 'query',
  mutation = 'mutation',
}

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

function restrictToTupleKeys<T extends string>() {
  // The type is now a Record with keys exactly from the tuple, but each key is optional
  return <U extends { [K in keyof U]: K extends T ? number : never }>(
    obj: U & Partial<Record<T, number>>,
  ): U => {
    return obj
  }
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
      [K in keyof EndpointDefs]: K extends MethodKeys<SI> ? DistributiveOmit<
          | QueryDefinitionWithQueryFn<
            Parameters<SI[K]>[0],
            FakeBaseQuery<ErrorType>,
            TagTypes,
            Effect.Effect.Success<ReturnType<SI[K]>>,
            ReducerPath
          >
          | MutationDefinitionQueryFn<
            Parameters<SI[K]>[0],
            FakeBaseQuery<ErrorType>,
            TagTypes,
            Effect.Effect.Success<ReturnType<SI[K]>>,
            ReducerPath
          >,
          'queryFn'
        >
        : never
    },
  >(
    // Takes a service tag (Context.Tag) and configuration options
    serviceTag: Context.Tag<S, SI>,
    // allow serializeQueryArgs
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

    type EndpointKeys = Extract<keyof EndpointDefs, MethodKeys<SI>>
    type Endpoints = {
      [K in EndpointKeys]: EndpointDefs[K]['type'] extends DefinitionType.query
        ? QueryDefinitionWithQueryFn<
          Parameters<SI[K]>[0],
          FakeBaseQuery<ErrorType>,
          TagTypes,
          Effect.Effect.Success<ReturnType<SI[K]>>,
          ReducerPath
        >
        : MutationDefinitionQueryFn<
          Parameters<SI[K]>[0],
          FakeBaseQuery<ErrorType>,
          TagTypes,
          Effect.Effect.Success<ReturnType<SI[K]>>,
          ReducerPath
        >
    }
    const api = createApi({
      ...createApiOptions,
      baseQuery: fakeBaseQuery<ErrorType>(),
      // Define the shape of our endpoints using TypeScript generics
      endpoints: (builder): Endpoints => {
        // Initialize empty endpoints object
        const endpoints = {} as Record<EndpointKeys, any>
        // Get all method keys from options, excluding 'reducerPath'
        const methodKeys = Object.keys(endpointConfigs) as Array<EndpointKeys>

        // Iterate through each method to create corresponding endpoints
        methodKeys.forEach(methodKey => {
          type Method = SI[typeof methodKey]
          type ResultType = Effect.Effect.Success<ReturnType<Method>>
          type QueryType = Parameters<Method>[0]

          // Get the configuration for this method from options
          const config = endpointConfigs[methodKey]

          // Create either a query or mutation endpoint based on config.type
          if (config.type === 'query') {
            endpoints[methodKey] = builder.query<ResultType, QueryType>({
              ...(config.forceRefetch !== undefined
                ? { extraOptions: config.forceRefetch }
                : {}),
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
              queryFn: createQueryFn(methodKey),
            })
          } else if (config.type === 'mutation') {
            endpoints[methodKey] = builder.mutation<ResultType, QueryType>({
              ...(config.invalidatesTags !== undefined
                ? { extraOptions: config.invalidatesTags }
                : {}),
              ...(config.onCacheEntryAdded !== undefined
                ? { extraOptions: config.onCacheEntryAdded }
                : {}),
              ...(config.onQueryStarted !== undefined
                ? { extraOptions: config.onQueryStarted }
                : {}),
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
