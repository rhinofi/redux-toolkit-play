import { createApiFromEffectTag } from '../../app/createApiFromEffectTag'
import { DefinitionType } from '../../app/createApiFromEffectTagFactory'
import { QuotesApi } from '../../services/QuotesApi'
// import { DefinitionType } from '@reduxjs/toolkit/query/react'

export const quotesApiSlice = createApiFromEffectTag(
  QuotesApi,
  {
    reducerPath: 'quotesApi',
    tagTypes: ['a', 'b'],
  },
  {
    addQuote: {
      type: DefinitionType.mutation,
      invalidatesTags: ['a'],
    },
    getQuotes: {
      type: DefinitionType.query,
    },
  } as const,
)

export const {
  useGetQuotesQuery,
  useAddQuoteMutation,
} = quotesApiSlice

// @ts-expect-error
export const { useAddQuotesQuery } = quotesApiSlice
// @ts-expect-error
export const { useGetQuotesMutation } = quotesApiSlice
