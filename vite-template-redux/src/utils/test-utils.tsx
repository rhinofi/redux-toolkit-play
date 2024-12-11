import type React from 'react'
import { Provider } from 'react-redux'
import type { Context } from 'effect'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { configureStore } from '@reduxjs/toolkit'
import { Layer, ManagedRuntime } from 'effect'
import type { RootState } from '../app/store'
import { rootReducer } from '../app/store' // You'll need to export this
import { QuotesApi } from '../services/QuotesApi'
import { UserApi } from '../services/UserApi'
import { defaultTestImpl as quotesTestImpl } from '../services/QuotesApiTest'
import { defaultTestImpl as userTestImpl } from '../services/UserApiTest'
import { quotesApiSlice } from '../features/quotes/quotesApiSlice'
import { AppLayerTest } from '../services/AppLayerTest'

// Map of service tags to their implementations
export const serviceMap = {
  QuotesApi: {
    tag: QuotesApi,
    defaultImpl: quotesTestImpl
  },
  UserApi: {
    tag: UserApi,
    defaultImpl: userTestImpl
  }
} as const;

export type ServiceKey = keyof typeof serviceMap;
export type Services = {
  [K in ServiceKey]?: Partial<Context.Tag.Service<(typeof serviceMap)[K]['tag']>>
}

export const createTestRuntime = (mocks?: Services) => {
  const mockedLayer = () => {
    if (!mocks) return AppLayerTest;
    const mockLayers = Object.entries(mocks).map(([key, implementation]) => {
      const service = serviceMap[key as ServiceKey];
      const fullImpl = { ...service.defaultImpl, ...implementation };
      return Layer.succeed(service.tag, fullImpl);
    });
    const mergedMocks = mockLayers.reduce((acc, layer) => Layer.merge(acc, layer));
    return Layer.provide(mergedMocks, AppLayerTest);
  }
  return ManagedRuntime.make(mockedLayer());
}; 

interface RenderOptions {
  preloadedState?: Partial<RootState>
  mocks?: Services
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState = {},
    mocks,
    ...renderOptions
  }: RenderOptions = {}
) {
  const runtime = createTestRuntime(mocks)

  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
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
  })

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>
  }

  return {
    store,
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}
