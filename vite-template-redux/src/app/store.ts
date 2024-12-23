// src/app/store.ts
import type { Action, ThunkAction } from '@reduxjs/toolkit'
import { combineSlices, configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { Effect, ManagedRuntime } from 'effect'
import { counterSlice } from '../features/counter/counterSlice'
import { quotesApiSlice } from '../features/quotes/quotesApiSlice'
import { AppLayerLive } from '../services/AppLayerLive'

export const rootReducer = combineSlices(counterSlice, quotesApiSlice)

// Create a managed runtime with our services
const runtime = ManagedRuntime.make(AppLayerLive)

export type ThunkExtraArgument = {
  runtime: typeof runtime
}

// Define RootState using the reducer type instead of the store
export type RootState = ReturnType<typeof rootReducer>

// Configure the store
export const makeStore = (preloadedState?: Partial<RootState>) => {
  const store = configureStore({
    reducer: rootReducer,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        thunk: {
          extraArgument: {
            runtime,
          },
        },
        serializableCheck: false,
      })
        .concat(quotesApiSlice.middleware),
    preloadedState,
  })
  setupListeners(store.dispatch)
  return store
}

export const store = makeStore()
export type AppStore = typeof store

// Export types
export type AppDispatch = typeof store.dispatch

// Clean up runtime when app is unmounted
window.addEventListener('unload', () => {
  Effect.runFork(runtime.disposeEffect)
})

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  ThunkExtraArgument,
  Action<string>
>
