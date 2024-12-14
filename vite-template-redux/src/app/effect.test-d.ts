import { skipToken } from '@reduxjs/toolkit/query'
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
      getData: { type: 'query' },
      updateData: { type: 'mutation' },
    })

    const { useGetDataQuery, useUpdateDataQuery } = api

    type GetDataParameterType = Parameters<typeof useGetDataQuery>[0]
    type GetDataReturnType = ReturnType<typeof useGetDataQuery>
    type GetDataDataType = GetDataReturnType['data']
    type GetDataErrorType = GetDataReturnType['error']

    expectTypeOf<GetDataParameterType>().toMatchTypeOf<
      { id: string } | typeof skipToken
    >()
    expectTypeOf<GetDataDataType>().toMatchTypeOf<string | undefined>()
    expectTypeOf<GetDataErrorType>().toMatchTypeOf<Error | undefined>()

    type UpdateDataParameterType = Parameters<typeof useUpdateDataQuery>[0]
    type UpdateDataReturnType = ReturnType<typeof useUpdateDataQuery>
    type UpdateDataDataType = UpdateDataReturnType['data']
    type UpdateDataErrorType = UpdateDataReturnType['error']

    expectTypeOf<UpdateDataParameterType>().toMatchTypeOf<
      { id: string; value: string } | typeof skipToken
    >()
    expectTypeOf<UpdateDataDataType>().toMatchTypeOf<boolean | undefined>()
    expectTypeOf<UpdateDataErrorType>().toMatchTypeOf<Error | undefined>()
  })
})
