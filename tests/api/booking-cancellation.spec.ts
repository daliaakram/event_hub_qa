import { randomUUID } from 'node:crypto';
import type { BookingInput } from '../../src/api/types';
import { randomCustomerPhone } from '../fixtures/customer-data';
import { expect, test } from '../fixtures/test';

test('cancels a booking through the REST API', async ({ api, bookableEvent, bookingCleanup }) => {
  const input: BookingInput = {
    eventId: bookableEvent.id,
    customerName: 'EventHub API Visitor',
    customerEmail: `api-cancellation-${randomUUID()}@example.com`,
    customerPhone: randomCustomerPhone(),
    quantity: 1,
  };
  const createResponse = await api.createBooking(input);
  expect(createResponse.status()).toBe(201);
  const created = (await createResponse.json()).data;
  bookingCleanup.track(created.id);

  const cancelResponse = await api.cancelBooking(created.id);
  expect(cancelResponse.status()).toBe(200);
  bookingCleanup.untrack(created.id);
  expect((await api.getBooking(created.id)).status()).toBe(404);
});
