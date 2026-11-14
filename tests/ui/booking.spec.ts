import { randomInt, randomUUID } from 'node:crypto';
import { BookingPage } from '../../src/pages/booking-page';
import { MyBookingsPage } from '../../src/pages/my-bookings-page';
import {
  availableSeatsFromCardText,
  availableSeatsPattern,
  eventCardFor,
} from '../fixtures/event-card';
import { randomCustomerPhone, randomInvalidCustomerPhone } from '../fixtures/customer-data';
import { expect, test } from '../fixtures/test';
import type { Locator } from '@playwright/test';

function currency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

async function seatCountFromCard(card: Locator): Promise<number> {
  return availableSeatsFromCardText(await card.innerText());
}

test.describe('Booking tickets through the web app', () => {
  test('confirms the total, lists the booking, and checks available seats after booking', async ({
    authenticatedPage,
    api,
    bookingCleanup,
  }) => {
    const bookingPage = new BookingPage(authenticatedPage);
    const myBookings = new MyBookingsPage(authenticatedPage);
    const availableEvents = (await api.listEvents()).filter(event => event.availableSeats > 0);
    const featuredEventTitles = await authenticatedPage
      .getByTestId('event-card')
      .locator('h3')
      .allTextContents();
    const cancellationEvent = availableEvents[0];
    const featuredEvents = availableEvents.filter(
      event => event.id !== cancellationEvent?.id && featuredEventTitles.includes(event.title),
    );
    const eventsWithTicketCapacity = featuredEvents.filter(event => event.availableSeats >= 10);
    const selectableEvents = eventsWithTicketCapacity.length > 0 ? eventsWithTicketCapacity : featuredEvents;
    if (selectableEvents.length === 0) {
      throw new Error('No available featured event other than the first event can be booked.');
    }

    const event = selectableEvents[randomInt(selectableEvents.length)];
    const eventCard = eventCardFor(authenticatedPage, event.title);
    await expect(eventCard).toBeVisible();
    const availableSeatsBefore = await seatCountFromCard(eventCard);
    const maxTickets = Math.min(10, availableSeatsBefore);
    const quantity = randomInt(1, maxTickets + 1);
    expect(quantity).toBeGreaterThanOrEqual(1);
    expect(quantity).toBeLessThanOrEqual(maxTickets);
    const customer = {
      name: 'EventHub Test Visitor',
      email: `booking-${randomUUID()}@example.com`,
      phone: randomCustomerPhone(),
    };

    await bookingPage.open(event.id);
    await bookingPage.expectEvent(event);
    await bookingPage.selectQuantity(quantity);
    await expect(authenticatedPage.locator('#ticket-count')).toHaveText(String(quantity));
    await expect(
      authenticatedPage.getByText(currency(event.price * quantity), { exact: true }).last(),
    ).toBeVisible();
    await bookingPage.fillCustomer(customer.name, customer.email, customer.phone);
    await bookingPage.confirm();

    await expect(authenticatedPage.getByRole('heading', { name: 'Booking Confirmed!' })).toBeVisible();
    const reference = (await authenticatedPage.locator('.booking-ref').innerText()).trim();
    expect(reference).toMatch(/^[A-Z]-[A-Z0-9]{6}$/);
    const booking = await api.bookingDetailsByReference(reference);
    bookingCleanup.track(booking.id);

    await authenticatedPage.goto('/');
    await expect(eventCard).toContainText(availableSeatsPattern);
    await expect.poll(() => seatCountFromCard(eventCard))
      .toBe(availableSeatsBefore - quantity);
    const availableSeatsAfter = await seatCountFromCard(eventCard);
    expect(availableSeatsBefore).toBe(availableSeatsAfter + quantity);

    await myBookings.open();
    const bookingCard = myBookings.bookingCard(reference);
    await expect(bookingCard).toBeVisible();
    await expect(bookingCard).toContainText(`${quantity} ticket${quantity === 1 ? '' : 's'}`);
    await expect(bookingCard).toContainText(currency(event.price * quantity));
  });

  test('shows validation errors and does not create a booking for invalid customer details', async ({
    authenticatedPage,
    bookableEvent,
  }) => {
    const bookingPage = new BookingPage(authenticatedPage);
    let bookingRequests = 0;
    authenticatedPage.on('request', request => {
      if (request.method() === 'POST' && request.url().endsWith('/bookings')) {
        bookingRequests += 1;
      }
    });

    await bookingPage.open(bookableEvent.id);
    await bookingPage.fillCustomer('A', 'not-an-email', randomInvalidCustomerPhone());
    await bookingPage.confirm();

    await expect(authenticatedPage.getByText('Name must be at least 2 chars')).toBeVisible();
    await expect(authenticatedPage.getByText('Enter a valid email')).toBeVisible();
    await expect(authenticatedPage.getByText('Enter a valid 10-digit phone')).toBeVisible();
    await expect(authenticatedPage.getByRole('heading', { name: 'Booking Confirmed!' })).toHaveCount(0);
    expect(bookingRequests).toBe(0);
  });
});
