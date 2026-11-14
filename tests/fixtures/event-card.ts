import { type Locator, type Page } from '@playwright/test';

export const availableSeatsPattern = /\d+\s+seats?\s+(?:available|left)!?/i;

export function eventCardFor(page: Page, title: string): Locator {
  return page
    .getByTestId('event-card')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
}

export function availableSeatsFromCardText(text: string): number {
  const match = text.match(/(\d+)\s+seats?\s+(?:available|left)!?/i);
  if (!match) {
    throw new Error(`Could not find the available seat count in event card text: ${text}`);
  }
  console.log(`Available seats from card text: ${match[1]}`);
  return Number(match[1]);
}
