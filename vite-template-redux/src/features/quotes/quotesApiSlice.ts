import { createApiFromEffectTag, DefinitionType } from '../../app/effect'
import { QuotesApi } from '../../services/QuotesApi'
// import { DefinitionType } from '@reduxjs/toolkit/query/react'

export const quotesApiSlice = createApiFromEffectTag(QuotesApi, {
  reducerPath: 'quotesApi' as const,
}, {
  addQuote: {
    type: DefinitionType.mutation,
  },
  getQuotes: {
    type: DefinitionType.query,
  },
})

export const {
  useGetQuotesQuery,
  useAddQuoteMutation,
} = quotesApiSlice
