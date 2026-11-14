import { randomUUID } from 'node:crypto';
import { BookingPage } from '../../src/pages/booking-page';
import { MyBookingsPage } from '../../src/pages/my-bookings-page';
import { randomCustomerPhone } from '../fixtures/customer-data';
import {
  availableSeatsFromCardText,
  availableSeatsPattern,
  eventCardFor,
} from '../fixtures/event-card';
import { expect, test } from '../fixtures/test';

test.use({ bookableEventIndex: 0 });

test('cancels a booking from My Bookings', async ({
  authenticatedPage,
  api,
  bookableEvent,
  bookingCleanup,
}) => {
  const bookingPage = new BookingPage(authenticatedPage);
  const myBookings = new MyBookingsPage(authenticatedPage);
  const eventCard = eventCardFor(authenticatedPage, bookableEvent.title);
  const customer = {
    name: 'EventHub Test Visitor',
    email: `cancellation-${randomUUID()}@example.com`,
    phone: randomCustomerPhone(),
  };

  await bookingPage.open(bookableEvent.id);
  await bookingPage.fillCustomer(customer.name, customer.email, customer.phone);
  await bookingPage.confirm();

  await expect(authenticatedPage.getByRole('heading', { name: 'Booking Confirmed!' })).toBeVisible();
  const reference = (await authenticatedPage.locator('.booking-ref').innerText()).trim();
  expect(reference).toMatch(/^[A-Z]-[A-Z0-9]{6}$/);
  const booking = await api.bookingDetailsByReference(reference);
  bookingCleanup.track(booking.id);

  await authenticatedPage.goto('/');
  await expect(eventCard).toBeVisible();
  await expect(eventCard).toContainText(availableSeatsPattern);
  const seatsBeforeCancellation = availableSeatsFromCardText(await eventCard.innerText());

  await myBookings.open();
  await expect(myBookings.bookingCard(reference)).toBeVisible();
  await myBookings.cancel(reference);
  bookingCleanup.untrack(booking.id);

  await expect(authenticatedPage.getByText('Booking cancelled successfully')).toBeVisible();

  await authenticatedPage.goto('/');
  await expect(eventCard).toContainText(availableSeatsPattern);
  await expect.poll(async () => availableSeatsFromCardText(await eventCard.innerText()))
    .toBe(seatsBeforeCancellation + booking.quantity);
  const seatsAfterCancellation = availableSeatsFromCardText(await eventCard.innerText());
  expect(seatsAfterCancellation).toBe(seatsBeforeCancellation + booking.quantity);
});
