// src/features/quotes/Quotes.test.tsx
import React from 'react';
import { Provider } from 'react-redux';
import { render, screen } from '@testing-library/react';
import { testStore } from '../../app/testStore';
import { Quotes } from './Quotes';
import { renderWithProviders } from '../../utils/test-utils';
import { Effect } from 'effect';

test('renders default mocked quotes', async () => {
  render(
    <Provider store={testStore}>
      <Quotes />
    </Provider>
  );

  expect(await screen.findByText(/Mock quote #0/)).toBeInTheDocument();
  expect(await screen.findByText(/Mock quote #1/)).toBeInTheDocument();
  // Additional assertions...
});

test('renders overridden mocked quotes', async () => {
  renderWithProviders(<Quotes />, { mocks: {
    QuotesApi: {
      getQuotes: (limit: number) =>
        Effect.succeed({
          quotes: [
            { id: 0, text: 'Mock quote #0 overridden', quote: 'Mock quote #0 overridden', author: 'Mock author #0 overridden' },
            { id: 1, text: 'Mock quote #1 overridden', quote: 'Mock quote #1 overridden', author: 'Mock author #1 overridden' }
          ],
          total: 2,
          skip: 0,
          limit
        })
    }
  }
  })
  

  expect(await screen.findByText(/Mock quote #0 overridden/)).toBeInTheDocument();
  expect(await screen.findByText(/Mock quote #1 overridden/)).toBeInTheDocument();
  // Additional assertions...
});