import { configureStore } from '@reduxjs/toolkit'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Context } from 'effect'
import { Layer, ManagedRuntime } from 'effect'
import type React from 'react'
import { Provider } from 'react-redux'
import type { RootState } from '../app/store'
import { rootReducer } from '../app/store'
import { quotesApiSlice } from '../features/quotes/quotesApiSlice'
import { AppServiceTagsTypes } from '../services/AppLayerLive'
import { AppLayerTest } from '../services/AppLayerTest'
import { FromHttpApiClient } from '../services/FromHttpApiClient'
import { QuotesApi } from '../services/QuotesApi'
import { defaultTestImpl as quotesTestImpl } from '../services/QuotesApiTest'
import { UserApi } from '../services/UserApi'
import { defaultTestImpl as userTestImpl } from '../services/UserApiTest'

type MockMapElem<
  T extends Context.Tag<any, any> | Context.TagClassShape<any, any>,
> = T extends T ? {
    tag: T
    defaultImpl: Context.Tag.Service<T>
  }
  : never

type MockMapElems = MockMapElem<AppServiceTagsTypes>

type TagClassId<T extends Context.TagClass<any, any, any>> = T extends
  Context.TagClass<any, infer Id, any> ? Id : never

// Assuming all app services use class based tags.
export type ServiceKey = TagClassId<AppServiceTagsTypes>

// Map of service tags to their implementations
export const serviceMap = {
  QuotesApi: {
    tag: QuotesApi,
    defaultImpl: quotesTestImpl,
  },
  UserApi: {
    tag: UserApi,
    defaultImpl: userTestImpl,
  },
  FromHttpApiClient: {
    tag: FromHttpApiClient,
    // TODO
    defaultImpl: {} as any,
  },
  // TODO: can we enforce key matching { tag, impl }?
} as const satisfies Record<ServiceKey, MockMapElems>

export type Services = {
  [K in ServiceKey]?: Partial<
    Context.Tag.Service<(typeof serviceMap)[K]['tag']>
  >
}

export const createTestRuntime = (mocks?: Services) => {
  const mockedLayer = () => {
    if (!mocks) return AppLayerTest
    const mockLayers = Object.entries(mocks).map(([key, implementation]) => {
      const service = serviceMap[key as ServiceKey]
      const fullImpl = { ...service.defaultImpl, ...implementation }
      return Layer.succeed(service.tag, fullImpl)
    })
    const mergedMocks = mockLayers.reduce((acc, layer) =>
      Layer.merge(acc, layer)
    )
    return Layer.provide(mergedMocks, AppLayerTest)
  }
  return ManagedRuntime.make(mockedLayer())
}

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
  }: RenderOptions = {},
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
        .concat(quotesApiSlice.middleware),
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
