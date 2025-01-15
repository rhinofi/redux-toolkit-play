// NOTE: test-d.ts file are only typed checked by vitest
// the tests are not actually ran.
import type { SerializedError } from '@reduxjs/toolkit'
import { skipToken } from '@reduxjs/toolkit/query'
import { Context, Effect, Schema } from 'effect'
import { describe, expectTypeOf, it } from 'vitest'
import {
  createApiFromEffectTagFactory,
  DefinitionType,
} from './createApiFromEffectTagFactory.js'

export class GetDataError extends Schema.TaggedError<GetDataError>()(
  'GetDataError',
  { message: Schema.String },
) {}

export class UpdateDataError extends Schema.TaggedError<UpdateDataError>()(
  'UpdateDataError',
  { message: Schema.String },
) {}

type AllApiErrors = GetDataError | UpdateDataError
// SerializedError is added by rtk
type AllErrors = AllApiErrors | SerializedError

// Define a sample service interface for testing
class TestService extends Context.Tag('TestService')<
  TestService,
  {
    getData: (
      input: { id: string },
    ) => Effect.Effect<string, GetDataError, never>
    updateData: (
      input: { id: string; value: string },
    ) => Effect.Effect<boolean, UpdateDataError, never>
    noInput: () => Effect.Effect<boolean>
  }
>() {}

export class EffectService
  extends Effect.Service<EffectService>()('EffectService', {
    effect: Effect.succeed({
      a: (): Effect.Effect<'a', 'error'> => Effect.succeed('a'),
    }),
    dependencies: [],
  })
{}

const createApiFromEffectTag = createApiFromEffectTagFactory<
  TestService | EffectService
>()

describe('createApiFromEffectTag hooks', () => {
  it('creates hooks with correct types', () => {
    const apiFromEffectService = createApiFromEffectTag(
      EffectService,
      {
        reducerPath: 'apiFromEffectService',
      },
      {
        a: { type: DefinitionType.query },
      },
    )
    const { useAQuery } = apiFromEffectService

    expectTypeOf<Parameters<typeof useAQuery>[0]>().toEqualTypeOf<
      void | undefined | typeof skipToken
    >()

    const { data: dataA, error: errorA } = useAQuery()

    expectTypeOf<typeof dataA>().toEqualTypeOf<
      'a' | undefined
    >()

    expectTypeOf<typeof errorA>().toEqualTypeOf<
      'error' | undefined | SerializedError
    >()

    const api = createApiFromEffectTag(TestService, {
      reducerPath: 'testApi',
    }, {
      getData: { type: DefinitionType.query as const },
      updateData: { type: DefinitionType.mutation as const },
      noInput: { type: DefinitionType.query as const },
    })

    const { useGetDataQuery, useUpdateDataMutation, useNoInputQuery } = api

    expectTypeOf<Parameters<typeof useNoInputQuery>[0]>().toEqualTypeOf<
      void | undefined | typeof skipToken
    >()

    const { data, error } = useGetDataQuery({ id: 'userId ' })

    type GetDataParameterType = Parameters<typeof useGetDataQuery>[0]

    expectTypeOf<GetDataParameterType>().toEqualTypeOf<
      { id: string } | typeof skipToken
    >()
    expectTypeOf<typeof data>().toEqualTypeOf<string | undefined>()
    expectTypeOf<typeof error>().toEqualTypeOf<AllErrors | undefined>()

    /**
     * We expect the useUpdateDataMutation hook to return a tuple
     * with the following types: [
     *   ({ id: string; value: string }) => Promise<>, {
     *     status: 'pending' | 'fulfilled' | 'rejected';
     *     data: boolean | undefined;
     *     error: Error | undefined;
     *   }
     * ]
     */
    type UpdateDataReturnType = ReturnType<typeof useUpdateDataMutation>

    // Test the mutation trigger function type
    type MutationTrigger = UpdateDataReturnType[0]
    expectTypeOf<Parameters<MutationTrigger>[0]>().toEqualTypeOf<{
      id: string
      value: string
    }>()
    expectTypeOf<Awaited<ReturnType<MutationTrigger>>>().toEqualTypeOf<
      {
        data: boolean
        error?: undefined
      } | {
        data?: undefined
        error: UpdateDataError | GetDataError | SerializedError
      }
    >()

    // Test the mutation result type
    type MutationResult = UpdateDataReturnType[1]
    expectTypeOf<MutationResult>().toEqualTypeOf<
      Record<string, any> & {
        originalArgs?: {
          id: string
          value: string
        } | undefined
        reset: () => void
      }
    >()
  })
})
