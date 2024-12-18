// src/services/QuotesApi.ts
import type { Effect } from 'effect'
import { Context } from 'effect'

export interface Quote {
  id: number
  quote: string
  author: string
}

export interface QuotesApiResponse {
  quotes: Quote[]
  total: number
  skip: number
  limit: number
}

export interface QuotesApiService {
  addQuote(quote: Quote): Effect.Effect<Quote, Error>
  getQuotes(limit: number): Effect.Effect<QuotesApiResponse, Error>
}

export class QuotesApi extends Context.Tag('QuotesApi')<
  QuotesApi,
  QuotesApiService
>() {}
