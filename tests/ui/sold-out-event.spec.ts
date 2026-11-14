import { randomUUID } from 'node:crypto';
import type { Booking } from '../../src/api/types';
import { randomCustomerPhone } from '../fixtures/customer-data';
import { expect, test } from '../fixtures/test';

test('shows an event as sold out after booking its remaining seats', async ({
  api,
  authenticatedPage,
  bookingCleanup,
}) => {
  const eventCards = authenticatedPage.getByTestId('event-card');
  await expect(eventCards.first()).toBeVisible();
  let event: { id: number; title: string; availableSeats: number } | undefined;
  for (let index = 0; index < await eventCards.count(); index += 1) {
    const card = eventCards.nth(index);
    const seats = (await card.innerText()).match(/(\d+)\s+seats?\s+(?:available|left)!?/i);
    if (!seats) {
      continue;
    }

    const availableSeats = Number(seats[1]);
    if (availableSeats < 1 || availableSeats >= 10) {
      continue;
    }

    const title = (await card.locator('h3').innerText()).trim();
    const href = await card.locator('a[href^="/events/"]').first().getAttribute('href');
    const eventId = href?.match(/^\/events\/(\d+)$/);
    if (!eventId) {
      throw new Error(`Could not read the event ID from card link: ${href}`);
    }
    event = { id: Number(eventId[1]), title, availableSeats };
    break;
  }

  if (!event) {
    throw new Error('No event with between 1 and 9 available seats was found.');
  }

  const response = await api.createBooking({
    eventId: event.id,
    customerName: 'EventHub Test Visitor',
    customerEmail: `sold-out-${randomUUID()}@example.com`,
    customerPhone: randomCustomerPhone(),
    quantity: event.availableSeats,
  });
  if (response.status() !== 201) {
    throw new Error(
      `Could not book the remaining event seats (${response.status()}): ${await response.text()}`,
    );
  }

  const booking = (await response.json()).data as Booking;
  bookingCleanup.track(booking.id);

  await expect.poll(async () => {
    const updatedEvent = (await api.listEvents()).find(candidate => candidate.id === event.id);
    if (!updatedEvent) {
      throw new Error(`Event ${event.id} disappeared after booking its remaining seats.`);
    }
    return updatedEvent.availableSeats;
  }).toBe(0);

  await authenticatedPage.goto('/');
  const soldOutCard = authenticatedPage
    .getByTestId('event-card')
    .filter({ has: authenticatedPage.getByRole('heading', { name: event.title, exact: true }) });
  const soldOutLabel = soldOutCard.getByText('Sold Out', { exact: true });
  await expect(soldOutCard).toBeVisible();
  await expect(soldOutCard).toContainText('SOLD OUT');
  await expect(soldOutLabel).toBeVisible();
  await expect(soldOutCard.getByRole('link', { name: 'Book Now', exact: true })).toHaveCount(0);
  await expect(soldOutCard.getByRole('button', { name: 'Book Now', exact: true })).toHaveCount(0);
  const soldOutIsClickable = await soldOutLabel.evaluate(element => {
    const control = element.closest('a, button, [role="link"], [role="button"]');
    if (!control) {
      return false;
    }

    const isDisabled =
      control.hasAttribute('disabled') ||
      control.getAttribute('aria-disabled') === 'true' ||
      getComputedStyle(control).pointerEvents === 'none';
    const canActivate =
      (control.tagName === 'A' && control.hasAttribute('href')) ||
      control.tagName === 'BUTTON' ||
      control.getAttribute('role') === 'link' ||
      control.getAttribute('role') === 'button';
    return canActivate && !isDisabled;
  });
  expect(soldOutIsClickable, 'Sold Out must not be an active link or button').toBe(false);

  let bookingAttempts = 0;
  await authenticatedPage.route('**/api/bookings', async route => {
    if (route.request().method() === 'POST') {
      bookingAttempts += 1;
      await route.abort();
      return;
    }
    await route.continue();
  });

  let clickWasBlocked = false;
  try {
    await soldOutLabel.click({ timeout: 1_000 });
  } catch (error) {
    if (!(error instanceof Error) || !/pointer events|not enabled|disabled/i.test(error.message)) {
      throw error;
    }
    clickWasBlocked = true;
  }
  expect(clickWasBlocked, 'The Sold Out control should reject pointer clicks').toBe(true);
  expect(bookingAttempts).toBe(0);
});
