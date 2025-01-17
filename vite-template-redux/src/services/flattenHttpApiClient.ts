import type { HttpApiClient } from '@effect/platform'
import type { HttpClientResponse } from '@effect/platform/HttpClientResponse'
import { Effect } from 'effect'

function Capitalize<S extends string>(str: S): Capitalize<S> {
  return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<S>
}

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends
  ((k: infer I) => void) ? I : never

type ExtractTupleType<T> = T extends Effect.Effect<infer S, infer E, infer R>
  ? Effect.Effect<[S extends [any, any] ? S[0] : S, HttpClientResponse], E, R>
  : never

type ExtractSuccessType<T> = T extends Effect.Effect<infer S, infer E, infer R>
  ? Effect.Effect<S extends [any, any] ? S[0] : S, E, R>
  : never

export type TransformGroup<
  Id extends string,
  T extends Record<any, any>,
> = T extends Record<infer M extends string, any> ? {
    [N in M]:
      & {
        [P in `${Id}${Capitalize<N>}`]: T[N] extends
          (args: infer Args) => infer Return
          ? Args extends { withResponse?: any } ? (
              args: Omit<Args, 'withResponse'>,
            ) => ExtractSuccessType<Return>
          : T[N]
          : never
      }
      & {
        [P in `${Id}${Capitalize<N>}WithResponse`]: T[N] extends
          (args: infer Args) => infer Return
          ? Args extends { withResponse?: any }
            ? (args: Omit<Args, 'withResponse'>) => ExtractTupleType<Return>
          : never
          : never
      }
  }[M]
  : never

export type FlattenedApi<T extends HttpApiClient.Client<any, any>> =
  UnionToIntersection<
    T extends Record<infer K extends string, any> ? {
        [N in K]: TransformGroup<N, T[N]>
      }[K]
      : never
  >

export const flattenHttpApiClient = <
  T extends HttpApiClient.Client<any, any>,
  E,
  R,
>(
  client: Effect.Effect<T, E, R>,
): Effect.Effect<FlattenedApi<T>, E, R> =>
  Effect.gen(function*() {
    const clientInstance = yield* client
    const result = {} as Record<string, unknown>

    for (const [groupKey, group] of Object.entries(clientInstance)) {
      const typedGroup = group as Record<
        string,
        HttpApiClient.Client.Method<any, any, any>
      >
      for (const [endpointKey, endpoint] of Object.entries(typedGroup)) {
        // Regular endpoint without response - returns just the data
        const flatKey = `${groupKey}${Capitalize(endpointKey)}`
        const regularEndpoint = (
          request: Omit<Parameters<typeof endpoint>[0], 'withResponse'>,
        ) => endpoint({ ...request })
        result[flatKey] = regularEndpoint

        // Endpoint with response - always returns [data, response]
        const flatKeyWithResponse = `${groupKey}${
          Capitalize(endpointKey)
        }WithResponse`
        const withResponseEndpoint = (
          request: Omit<Parameters<typeof endpoint>[0], 'withResponse'>,
        ) =>
          endpoint({
            ...request,
            withResponse: true as const,
          })
        result[flatKeyWithResponse] = withResponseEndpoint
      }
    }

    return result as FlattenedApi<T>
  })
