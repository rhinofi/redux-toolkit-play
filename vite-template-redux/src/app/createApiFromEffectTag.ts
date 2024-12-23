import type { RuntimeServices } from '../services/AppLayerLive'
import { createApiFromEffectTagFactory } from './effect'

export const createApiFromEffectTag = createApiFromEffectTagFactory<
  RuntimeServices
>()
