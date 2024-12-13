// src/services/AppLayer.ts
import { Context, Layer } from 'effect';
import { UserApiLive } from './UserApiLive';
import { QuotesApiLive } from './QuotesApiLive';
import { UserApi } from './UserApi';
import { QuotesApi } from './QuotesApi';

export const AppServiceTags = [QuotesApi, UserApi] as const
export type AppServiceTagsTypes = typeof AppServiceTags[number]
export type RuntimeServices = Context.Tag.Identifier<AppServiceTagsTypes>

export const AppLayerLive: Layer.Layer<RuntimeServices> = Layer.merge(UserApiLive, QuotesApiLive);
