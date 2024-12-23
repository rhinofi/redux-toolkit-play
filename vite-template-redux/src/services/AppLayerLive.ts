// src/services/AppLayer.ts
import type { Context } from 'effect'
import { Layer } from 'effect'
import { FromHttpApiClient, FromHttpApiClientLive } from './FromHttpApiClient'
import { QuotesApi } from './QuotesApi'
import { QuotesApiLive } from './QuotesApiLive'
import { UserApi } from './UserApi'
import { UserApiLive } from './UserApiLive'

export const AppServiceTags = [QuotesApi, UserApi, FromHttpApiClient] as const
export type AppServiceTagsTypes = typeof AppServiceTags[number]
export type RuntimeServices = Context.Tag.Identifier<AppServiceTagsTypes>

export const AppLayerLive: Layer.Layer<RuntimeServices, any> = Layer.mergeAll(
  UserApiLive,
  QuotesApiLive,
  FromHttpApiClientLive,
)
