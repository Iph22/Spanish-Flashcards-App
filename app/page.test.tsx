import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SpanishFlashcards from './page';

// Mock the fetch function
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ sentence: 'This is a test sentence.' }),
  })
) as jest.Mock;

describe('SpanishFlashcards', () => {
  beforeEach(() => {
    const now = Date.now();
    // Set up progress so that test conditions are deterministic.
    // A card is due if it has no review history, or if its last review is past the interval.
    window.flashcardProgress = {
      boxes: {
        // Basics
        b1: 3, b2: 1, b3: 1, b4: 1, b5: 1, b6: 1, b7: 1, b8: 1, b9: 1, b10: 1,
        // Colors
        c1: 4, c2: 2, c3: 2, c4: 2, c5: 2, c6: 2, c7: 2, c8: 2,
        // Other decks to ensure they don't interfere
        d1: 1, m1: 1,
      },
      reviews: [
        // Make all BASICS cards except 'b1' (Hello) not due by giving them a recent review.
        { cardId: 'b2', result: 'good', ts: now },
        { cardId: 'b3', result: 'good', ts: now },
        { cardId: 'b4', result: 'good', ts: now },
        { cardId: 'b5', result: 'good', ts: now },
        { cardId: 'b6', result: 'good', ts: now },
        { cardId: 'b7', result: 'good', ts: now },
        { cardId: 'b8', result: 'good', ts: now },
        { cardId: 'b9', result: 'good', ts: now },
        { cardId: 'b10', result: 'good', ts: now },

        // Make all COLORS cards except 'c1' (Red) not due.
        { cardId: 'c2', result: 'good', ts: now },
        { cardId: 'c3', result: 'good', ts: now },
        { cardId: 'c4', result: 'good', ts: now },
        { cardId: 'c5', result: 'good', ts: now },
        { cardId: 'c6', result: 'good', ts: now },
        { cardId: 'c7', result: 'good', ts: now },
        { cardId: 'c8', result: 'good', ts: now },
      ],
      streak: 5,
      lastStudyDayISO: '2023-10-26',
    };
  });

  test('should reset progress for a specific deck while leaving others unchanged', async () => {
    render(<SpanishFlashcards />);

    // 1. Select the "Colors" deck.
    fireEvent.click(screen.getByText('Colors'));

    // 2. Verify that the only due card, "Red", is displayed and is in box 4.
    await waitFor(() => {
      expect(screen.getByText('Red')).toBeInTheDocument();
    });
    expect(screen.getByTestId('mastery-badge-4')).toBeInTheDocument();

    // 3. Click the reset button for the "Colors" deck.
    fireEvent.click(screen.getByText('Reset'));

    // 4. After reset, all cards in the "Colors" deck are due and in box 1.
    // The current card will be one of them. We verify its box number.
    await waitFor(() => {
      expect(screen.getByTestId('mastery-badge-1')).toBeInTheDocument();
    });

    // 5. Verify the streak is NOT reset when a specific deck is reset.
    expect(screen.getByText('5 days')).toBeInTheDocument();

    // 6. Now, switch to the "Basics" deck to verify its progress is untouched.
    fireEvent.click(screen.getByText('Basics'));

    // 7. Verify that the only due card, "Hello", is displayed.
    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    // 8. Verify the "Hello" card is still in its original box 3.
    expect(screen.getByTestId('mastery-badge-3')).toBeInTheDocument();
  });

  test('should reset all progress and streak when "All" deck is selected', async () => {
    render(<SpanishFlashcards />);

    // 1. Ensure "All" is selected (default).
    // The due cards are 'Hello' and 'Red'. The component will show one.
    await waitFor(() => {
      expect(screen.getByTestId(/mastery-badge-/)).toBeInTheDocument();
    });

    // 2. Click the reset button.
    fireEvent.click(screen.getByText('Reset'));

    // 3. After reset, all cards are in box 1 and are due.
    // The new current card will be one of them. We verify its box number.
    await waitFor(() => {
        expect(screen.getByTestId('mastery-badge-1')).toBeInTheDocument();
    });

    // 4. Crucially, verify the streak was also reset to 0.
    expect(screen.getByText('0 days')).toBeInTheDocument();
  });
});