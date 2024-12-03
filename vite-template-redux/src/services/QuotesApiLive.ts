// src/services/QuotesApiLive.ts
import { Layer, Effect } from 'effect';
import type { QuotesApiResponse } from './QuotesApi';
import { QuotesApi } from './QuotesApi';

export const QuotesApiLive = Layer.effect(
  QuotesApi,
  Effect.gen(function* () {
    return {
      getQuotes: (limit: number) =>
        Effect.tryPromise({
          try: async () => {
            const response = await fetch(`https://dummyjson.com/quotes?limit=${limit}`);
            if (!response.ok) throw new Error('Failed to fetch quotes');
            return response.json() as Promise<QuotesApiResponse>;
          },
          catch: (error) => error as Error,
        }),
      }
  })
);