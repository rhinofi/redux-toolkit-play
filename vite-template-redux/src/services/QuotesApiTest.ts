// src/services/QuotesApiTest.ts
import { Layer, Effect } from 'effect';
import { QuotesApi, type QuotesApiService } from './QuotesApi';

// Default test implementation
export const defaultTestImpl: QuotesApiService = {
  getQuotes: (limit: number) =>
    Effect.succeed({
      quotes: Array.from({ length: limit }, (_, idx) => ({
        id: idx,
        quote: `Mock quote #${idx}`,
        author: 'Mock Author',
      })),
      total: limit,
      skip: 0,
      limit,
    }),
};

// Layer with default implementation
export const QuotesApiTest = Layer.succeed(
  QuotesApi,
  QuotesApi.of(defaultTestImpl)
);