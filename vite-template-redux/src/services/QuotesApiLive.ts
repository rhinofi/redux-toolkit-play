// src/services/QuotesApiLive.ts
import { Effect, Layer } from 'effect'
import type { Quote, QuotesApiResponse } from './QuotesApi'
import { QuotesApi } from './QuotesApi'

export const QuotesApiLive = Layer.effect(
  QuotesApi,
  Effect.gen(function*() {
    return {
      addQuote: (quote: Quote) =>
        Effect.tryPromise({
          try: async () => {
            const response = await fetch('https://dummyjson.com/quotes/add', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(quote),
            })
            if (!response.ok) throw new Error('Failed to add quote')
            return response.json() as Promise<Quote>
          },
          catch: error => error as Error,
        }),

      getQuotes: (limit: number) =>
        Effect.tryPromise({
          try: async () => {
            const response = await fetch(
              `https://dummyjson.com/quotes?limit=${limit}`,
            )
            if (!response.ok) throw new Error('Failed to fetch quotes')
            return response.json() as Promise<QuotesApiResponse>
          },
          catch: error => error as Error,
        }),
    }
  }),
)
