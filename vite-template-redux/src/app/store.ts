import type {
  Action,
  ConfigureStoreOptions,
  ThunkAction,
  UnknownAction,
} from '@reduxjs/toolkit'
import { combineSlices, configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { Context } from 'effect'
import {
  counterSlice,
  incrementByAmount,
} from '../features/counter/counterSlice'
import { quotesApiSlice } from '../features/quotes/quotesApiSlice'

// `combineSlices` automatically combines the reducers using
// their `reducerPath`s, therefore we no longer need to call `combineReducers`.
const rootReducer = combineSlices(counterSlice, quotesApiSlice)
// Infer the `RootState` type from the root reducer
export type RootState = ReturnType<typeof rootReducer>

interface User {
  readonly id: string
  readonly name: string
  readonly age: number
}

type UserApiService = {
  get: (id: string) => Promise<User>
}

class UserApi extends Context.Tag('UserApi')<UserApi, UserApiService>() {}

const AppApis = {
  user: {
    get: (id: string) => Promise.resolve({ id, name: 'user', age: 10 }),
  } satisfies UserApiService,
}

type AppApis = typeof AppApis

// The store setup is wrapped in `makeStore` to allow reuse
// when setting up tests that need the same store config
export const makeStore = (preloadedState?: Partial<RootState>) => {
  const store = configureStore({
    reducer: rootReducer,
    // Adding the api middleware enables caching, invalidation, polling,
    // and other useful features of `rtk-query`.
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({ thunk: { extraArgument: AppApis } }),
    preloadedState,
  })
  // configure listeners using the provided defaults
  // optional, but required for `refetchOnFocus`/`refetchOnReconnect` behaviors
  setupListeners(store.dispatch)
  return store
}

export const makeStore2 = (preloadedState?: Partial<RootState>) => {
  const store = configureStore({
    reducer: rootReducer,
    // Adding the api middleware enables caching, invalidation, polling,
    // and other useful features of `rtk-query`.
    // middleware: getDefaultMiddleware =>
    //   getDefaultMiddleware({ thunk: { extraArgument: { AppApis } } }),
    preloadedState,
  })
  // configure listeners using the provided defaults
  // optional, but required for `refetchOnFocus`/`refetchOnReconnect` behaviors
  setupListeners(store.dispatch)
  return store
}

export const store = makeStore()

// Infer the type of `store`
export type AppStore = typeof store

export const store2 = makeStore2()
export type AppStore2 = typeof store2

const store3: AppStore = store2

export type AppDispatch = AppStore['dispatch']
export type AppThunk<ThunkReturnType = void> = ThunkAction<
  ThunkReturnType,
  RootState,
  unknown,
  Action
>

type AppThunk2 = Parameters<AppDispatch>[0]
export type AppThunkWithApis<ThunkReturnType = void> = ThunkAction<
  ThunkReturnType,
  RootState,
  AppApis,
  Action
>

export const thunkAccessingApisViaExtraArg =
  (id: string): AppThunkWithApis => (dispatch: AppDispatch, getState, api) => {
    api.user.get(id).then(user => {
      console.log(user)
    })
  }

const thunkAction = thunkAccessingApisViaExtraArg('id')
store.dispatch(thunkAction)

store.dispatch((() => (a, b, c) => {
  c.user.get('id')
})())
