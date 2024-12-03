// src/services/AppLayer.ts
import { Layer } from 'effect';
import { UserApiLive } from './UserApiLive';
import { QuotesApiLive } from './QuotesApiLive';

export const AppLayerLive = Layer.merge(UserApiLive, QuotesApiLive);