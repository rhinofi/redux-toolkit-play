import type { RuntimeServices } from '../services/AppLayerLive'
import { createApiFromEffectTagFactory } from './createApiFromEffectTagFactory'

export const createApiFromEffectTag = createApiFromEffectTagFactory<
  RuntimeServices
>()
