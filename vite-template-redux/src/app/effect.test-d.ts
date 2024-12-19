import { SerializedError } from '@reduxjs/toolkit'
import { DefinitionType, skipToken } from '@reduxjs/toolkit/query'
import { Context, Effect, Schema } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { createApiFromEffectTagFactory } from './effect'

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

    const { data, error, isError } = useGetDataQuery({ id: 'userId ' })

    type GetDataParameterType = Parameters<typeof useGetDataQuery>[0]
    type GetDataReturnType = ReturnType<typeof useGetDataQuery>
    type GetDataDataType = GetDataReturnType['data']
    type GetDataErrorType = GetDataReturnType['error']

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
