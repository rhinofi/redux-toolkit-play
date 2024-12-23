// src/services/AppLayerTest.ts
import { Layer } from 'effect'
import { QuotesApiTest } from './QuotesApiTest'
import { UserApiTest } from './UserApiTest'

export const AppLayerTest = Layer.merge(UserApiTest, QuotesApiTest)
