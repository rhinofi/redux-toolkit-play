// src/services/AppLayerTest.ts
import { Layer } from 'effect';
import { UserApiTest } from './UserApiTest';
import { QuotesApiTest } from './QuotesApiTest';

export const AppLayerTest = Layer.merge(UserApiTest, QuotesApiTest);