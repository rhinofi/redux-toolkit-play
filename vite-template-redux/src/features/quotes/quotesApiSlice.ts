import { createApiFromEffectTag } from '../../app/effect'
import { QuotesApi } from '../../services/QuotesApi'

export const quotesApiSlice = createApiFromEffectTag(QuotesApi, {
  reducerPath: 'quotesApi',
  getQuotes: {
    type: 'query',
  },
})

export const { useGetQuotesQuery } = quotesApiSlice
