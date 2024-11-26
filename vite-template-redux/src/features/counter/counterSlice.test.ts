import type { AppStore } from '../../app/store'
import { makeStore } from '../../app/store'
import type { CounterSliceState } from './counterSlice'
import {
  counterSlice,
  decrement,
  fetchUserById,
  increment,
  incrementAsync,
  incrementByAmount,
  selectCount,
} from './counterSlice'

interface LocalTestContext {
  store: AppStore
}

describe<LocalTestContext>('counter reducer', it => {
  beforeEach<LocalTestContext>(context => {
    const initialState: CounterSliceState = {
      value: 3,
      status: 'idle',
    }

    const store = makeStore({ counter: initialState })

    context.store = store
  })

  it('should handle initial state', () => {
    expect(counterSlice.reducer(undefined, { type: 'unknown' })).toStrictEqual({
      value: 0,
      status: 'idle',
    })
  })

  it('should handle increment', ({ store }) => {
    expect(selectCount(store.getState())).toBe(3)

    store.dispatch(increment())

    expect(selectCount(store.getState())).toBe(4)
  })

  it('should handle decrement', ({ store }) => {
    expect(selectCount(store.getState())).toBe(3)

    store.dispatch(decrement())

    expect(selectCount(store.getState())).toBe(2)
  })

  it('should handle incrementByAmount', ({ store }) => {
    expect(selectCount(store.getState())).toBe(3)

    store.dispatch(incrementByAmount(2))

    expect(selectCount(store.getState())).toBe(5)
  })

  it('should handle incrementAsync', async ({ store }) => {
    expect(selectCount(store.getState())).toBe(3)

    const a = await store.dispatch(incrementAsync(2))

    expect(selectCount(store.getState())).toBe(5)
  })

  it.only('should handle incrementByAmount', async ({ store }) => {
    store.subscribe((...args) => console.log(store.getState()))

    expect(selectCount(store.getState())).toBe(3)

    const userId = 2
    const res = await store.dispatch(fetchUserById(userId))
    const { type } = res

    console.log('res', res)

    expect(res).toMatchObject({
      type: 'users/fetchByIdStatus/fulfilled',
      payload: { userId, name: 'some-name' },
    })

    expect(selectCount(store.getState())).toBe(3 + userId)
  })
})
