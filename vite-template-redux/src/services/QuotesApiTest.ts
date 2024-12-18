// src/services/QuotesApiTest.ts
import { Effect, Layer } from 'effect'
import { type Quote, QuotesApi, type QuotesApiService } from './QuotesApi'

// Default test implementation
export const defaultTestImpl: QuotesApiService = {
  addQuote: (quote: Quote) =>
    Effect.succeed({
      ...quote,
      id: Math.floor(Math.random() * 1000), // Generate a random ID for testing
    }),

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
}

// Layer with default implementation
export const QuotesApiTest = Layer.succeed(
  QuotesApi,
  QuotesApi.of(defaultTestImpl),
)
