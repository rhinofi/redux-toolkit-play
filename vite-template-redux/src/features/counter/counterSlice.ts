import {
  createAsyncThunk,
  type PayloadAction,
  SerializedError,
} from '@reduxjs/toolkit'
import { Effect, pipe, Schema } from 'effect'
import { Either } from 'effect'
import { serializeSuccess, TaggedError } from 'effect/Schema'
import { createAppSlice } from '../../app/createAppSlice'
import type { AppThunk, ThunkExtraArgument } from '../../app/store'
import { RuntimeServices } from '../../services/AppLayerLive'
import { fetchCount } from './counterAPI'
export interface CounterSliceState {
  value: number
  status: 'idle' | 'loading' | 'failed'
}

const initialState: CounterSliceState = {
  value: 0,
  status: 'idle',
}

interface User {
  readonly userId: number
  readonly name: string
}

export class FetchUserError extends TaggedError<FetchUserError>()(
  'FetchUserError',
  { message: Schema.String, userId: Schema.Number },
) {}

const fetchUserByIdEffect = (userId: number) =>
  Effect.suspend(() => {
    return Math.random() > 0.0001
      ? Effect.succeed({ userId, name: 'some-name' })
      : Effect.fail(
        new FetchUserError({ message: 'failed to fetch user', userId }),
      )
  })

export const fetchUserById = createAsyncThunk<User, number, {
  rejectValue: typeof FetchUserError.Encoded
}>(
  'users/fetchByIdStatus',
  async (userId: number, thunkAPI) =>
    Effect.runPromise(pipe(
      fetchUserByIdEffect(userId),
      Effect.catchTag('FetchUserError', error =>
        Effect
          .succeed(thunkAPI.rejectWithValue(
            Schema.encodeSync(FetchUserError)(error),
          ))),
    )),
)

const createEffectThunk = <Arg, A, E, R extends RuntimeServices>(
  typePrefix: string,
  effect: (arg: Arg) => Effect.Effect<A, E, R>,
) => {
  return createAsyncThunk<A, Arg, { rejectValue: E }>(
    typePrefix,
    async (arg: Arg, thunkAPI) => {
      const { extra } = thunkAPI as { extra: ThunkExtraArgument }
      const { runtime } = extra
      const result = await runtime.runPromise(
        effect(arg).pipe(Effect.either),
      )

      return Either.isLeft(result)
        ? thunkAPI.rejectWithValue(result.left)
        : result.right
    },
  )
}

const fetchUserById2 = createEffectThunk(
  'users',
  fetchUserByIdEffect,
)

// If you are not using async thunks you can use the standalone `createSlice`.
export const counterSlice = createAppSlice({
  name: 'counter',
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  // The `reducers` field lets us define reducers and generate associated actions
  reducers: create => ({
    increment: create.reducer(state => {
      // Redux Toolkit allows us to write "mutating" logic in reducers. It
      // doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a brand new
      // immutable state based off those changes
      state.value += 1
    }),
    decrement: create.reducer(state => {
      state.value -= 1
    }),
    // Use the `PayloadAction` type to declare the contents of `action.payload`
    incrementByAmount: create.reducer(
      (state, action: PayloadAction<number>) => {
        state.value += action.payload
      },
    ),
    // The function below is called a thunk and allows us to perform async logic. It
    // can be dispatched like a regular action: `dispatch(incrementAsync(10))`. This
    // will call the thunk with the `dispatch` function as the first argument. Async
    // code can then be executed and other actions can be dispatched. Thunks are
    // typically used to make async requests.
    incrementAsync: create.asyncThunk(
      async (amount: number) => {
        const response = await fetchCount(amount)
        // The value we return becomes the `fulfilled` action payload
        return response.data
      },
      {
        pending: state => {
          state.status = 'loading'
        },
        fulfilled: (state, action) => {
          state.status = 'idle'
          state.value += action.payload
        },
        rejected: state => {
          state.status = 'failed'
        },
      },
    ),
  }),
  extraReducers: builder => {
    // Add reducers for additional action types here, and handle loading state as needed
    builder.addCase(fetchUserById.fulfilled, (state, action) => {
      console.log('fetchUserById.fulfilled', action)
      state.status = 'idle'
      state.value = state.value + action.payload.userId
    })

    // builder.addCase(fetchUserById2.rejected, (state, action) => {
    //   console.log('fetchUserById2.rejected', action)

    //   const error = action.payload;
    //   state.status = 'failed'
    // })
  },
  // You can define your selectors here. These selectors receive the slice
  // state as their first argument.
  selectors: {
    selectCount: counter => counter.value,
    selectStatus: counter => counter.status,
  },
})

// Action creators are generated for each case reducer function.
export const { decrement, increment, incrementByAmount, incrementAsync } =
  counterSlice.actions

// Selectors returned by `slice.selectors` take the root state as their first argument.
export const { selectCount, selectStatus } = counterSlice.selectors

// We can also write thunks by hand, which may contain both sync and async logic.
// Here's an example of conditionally dispatching actions based on current state.
export const incrementIfOdd =
  (amount: number): AppThunk => (dispatch, getState) => {
    const currentValue = selectCount(getState())

    if (currentValue % 2 === 1 || currentValue % 2 === -1) {
      dispatch(incrementByAmount(amount))
    }
  }
