import { randomUUID } from 'node:crypto';
import type { BookingInput } from '../../src/api/types';
import { randomCustomerPhone } from '../fixtures/customer-data';
import { expect, test } from '../fixtures/test';

function bookingInput(eventId: number, quantity = 1): BookingInput {
  return {
    eventId,
    customerName: 'EventHub API Visitor',
    customerEmail: `api-${randomUUID()}@example.com`,
    customerPhone: randomCustomerPhone(),
    quantity,
  };
}

test.describe('EventHub: booking tickets through the REST API', () => {
  test('creates a booking, calculates its price, and lists it', async ({
    api,
    bookableEvent,
    bookingCleanup,
  }) => {
    const input = bookingInput(bookableEvent.id);
    const createResponse = await api.createBooking(input);
    expect(createResponse.status()).toBe(201);
    const created = (await createResponse.json()).data;
    bookingCleanup.track(created.id);

    expect(created.bookingRef).toMatch(/^[A-Z]-[A-Z0-9]{6}$/);
    expect(created.status).toBe('confirmed');
    expect(created.quantity).toBe(input.quantity);
    expect(Number(created.totalPrice)).toBe(bookableEvent.price * input.quantity);
    expect(created.customerEmail).toBe(input.customerEmail);

    const byReference = await api.getBookingByReference(created.bookingRef);
    expect(byReference.status()).toBe(200);
    expect((await byReference.json()).data.id).toBe(created.id);

    const listResponse = await api.listBookings();
    expect(listResponse.status()).toBe(200);
    expect((await listResponse.json()).data.some((booking: { id: number }) => booking.id === created.id))
      .toBe(true);
  });

  for (const quantity of [0, 11]) {
    test(`rejects quantity ${quantity} without creating a booking`, async ({ api, bookableEvent }) => {
      const input = bookingInput(bookableEvent.id, quantity);
      const response = await api.createBooking(input);
      expect(response.status()).toBe(400);

      const body = await api.errorBody(response);
      expect(body.success).toBe(false);
      expect(body.details?.some(detail => detail.field === 'quantity')).toBe(true);
      expect((await api.bookingsListBody()).data.some(
        booking => booking.customerEmail === input.customerEmail,
      )).toBe(false);
    });
  }

  test('rejects invalid customer email', async ({ api, bookableEvent }) => {
    const input = bookingInput(bookableEvent.id);
    input.customerEmail = 'not-an-email';
    const response = await api.createBooking(input);
    expect(response.status()).toBe(400);

    const body = await api.errorBody(response);
    expect(body.success).toBe(false);
    expect(body.details?.some(detail => detail.field === 'customerEmail')).toBe(true);
    expect((await api.bookingsListBody()).data.some(
      booking => booking.customerEmail === input.customerEmail,
    )).toBe(false);
  });

  test('returns not found for a non-existent event', async ({ api }) => {
    const input = bookingInput(2_147_483_647);
    const response = await api.createBooking(input);
    expect(response.status()).toBe(404);
    expect((await api.errorBody(response)).success).toBe(false);
    expect((await api.bookingsListBody()).data.some(
      booking => booking.customerEmail === input.customerEmail,
    )).toBe(false);
  });

  test('rejects protected resource access without a bearer token', async ({ anonymousApi }) => {
    const response = await anonymousApi.get('auth/me');
    expect(response.status()).toBe(401);
  });
});
