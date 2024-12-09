import { createApiFromEffectLayer } from '../../app/effect';
import { QuotesApi } from '../../services/QuotesApi';

export const quotesApiSlice = createApiFromEffectLayer(QuotesApi, {
  reducerPath: 'quotesApi',
  getQuotes: {
    type: 'query',
  },
});

export const { useGetQuotesQuery } = quotesApiSlice;
