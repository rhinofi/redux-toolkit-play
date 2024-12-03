// src/app/testStore.ts
import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from '@reduxjs/toolkit';
import { ManagedRuntime } from 'effect';
import { AppLayerTest } from '../services/AppLayerTest';
import { counterSlice } from '../features/counter/counterSlice';
import { quotesApiSlice } from '../features/quotes/quotesApiSlice';

// Create a managed runtime with our services
const runtime = ManagedRuntime.make(AppLayerTest);

export type ThunkExtraArgument = {
  runtime: typeof runtime;
};

// Combine reducers
const rootReducer = combineReducers({
  counter: counterSlice.reducer,
  [quotesApiSlice.reducerPath]: quotesApiSlice.reducer,
});

export const testStore = configureStore({
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
    .concat(quotesApiSlice.middleware)
});

export type AppDispatch = typeof testStore.dispatch;
export type RootState = ReturnType<typeof testStore.getState>;