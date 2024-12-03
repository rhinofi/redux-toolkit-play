// src/features/quotes/quotesApiSlice.ts
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import type { QuotesApiResponse } from '../../services/QuotesApi';
import { QuotesApi } from '../../services/QuotesApi';
import type { ThunkExtraArgument } from '../../app/store';
import { Effect, Either } from 'effect';

export const quotesApiSlice = createApi({
  reducerPath: 'quotesApi',
  baseQuery: fakeBaseQuery(),
  endpoints: builder => ({
    getQuotes: builder.query<QuotesApiResponse, number>({
      queryFn: async (limit, api) => {
        const { extra } = api as { extra: ThunkExtraArgument };

        const effect = Effect.gen(function* () {
          const quotes = yield* QuotesApi;
          return yield* quotes.getQuotes(limit);
        }).pipe(Effect.either);

        const quotesEither = await extra.runtime.runPromise(effect);

        if (Either.isLeft(quotesEither)) {
          return { error: quotesEither.left };
        }

        return { data: quotesEither.right };
      },
    }),
  }),
});

// Export hooks
export const { useGetQuotesQuery } = quotesApiSlice;