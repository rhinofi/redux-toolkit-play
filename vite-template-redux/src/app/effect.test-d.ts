import { DefinitionType, skipToken } from '@reduxjs/toolkit/query'
import { Context, Effect } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { createApiFromEffectTagFactory } from './effect'

// Define a sample service interface for testing
class TestService extends Context.Tag('TestService')<
  TestService,
  {
    getData: (input: { id: string }) => Effect.Effect<string, Error, never>
    updateData: (
      input: { id: string; value: string },
    ) => Effect.Effect<boolean, Error, never>
  }
>() {}

const createApiFromEffectTag = createApiFromEffectTagFactory<TestService>()

describe('createApiFromEffectTag hooks', () => {
  it('creates hooks with correct types', () => {
    const api = createApiFromEffectTag(TestService, {
      reducerPath: 'testApi',
    }, {
      getData: { type: DefinitionType.query as const },
      updateData: { type: DefinitionType.mutation as const },
    })

    const { useGetDataQuery, useUpdateDataMutation } = api

    type GetDataParameterType = Parameters<typeof useGetDataQuery>[0]
    type GetDataReturnType = ReturnType<typeof useGetDataQuery>
    type GetDataDataType = GetDataReturnType['data']
    type GetDataErrorType = GetDataReturnType['error']

    expectTypeOf<GetDataParameterType>().toMatchTypeOf<
      { id: string } | typeof skipToken
    >()
    expectTypeOf<GetDataDataType>().toMatchTypeOf<string | undefined>()
    expectTypeOf<GetDataErrorType>().toMatchTypeOf<Error | undefined>()

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
        error: any
      }
    >()

    // Test the mutation result type
    type MutationResult = UpdateDataReturnType[1]
    expectTypeOf<MutationResult>().toMatchTypeOf<
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
