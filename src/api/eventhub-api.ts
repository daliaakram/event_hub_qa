import type { APIRequestContext, APIResponse } from '@playwright/test';
import type {
  ApiEnvelope,
  ApiError,
  Booking,
  BookingInput,
  BookingListResponse,
  Event,
  EventListResponse,
} from './types';

export class EventHubApi {
  constructor(private readonly request: APIRequestContext) {}

  async listEvents(): Promise<Event[]> {
    const response = await this.request.get('events', {
      params: { page: 1, limit: 100 },
    });
    if (!response.ok()) {
      throw new Error(`Could not load events (${response.status()}): ${await response.text()}`);
    }

    return ((await response.json()) as EventListResponse).data;
  }

  createBooking(input: BookingInput): Promise<APIResponse> {
    return this.request.post('bookings', { data: input });
  }

  listBookings(): Promise<APIResponse> {
    return this.request.get('bookings', { params: { page: 1, limit: 100 } });
  }

  getBookingByReference(reference: string): Promise<APIResponse> {
    return this.request.get(`bookings/ref/${encodeURIComponent(reference)}`);
  }

  getBooking(id: number): Promise<APIResponse> {
    return this.request.get(`bookings/${id}`);
  }

  cancelBooking(id: number): Promise<APIResponse> {
    return this.request.delete(`bookings/${id}`);
  }

  async bookingDetailsByReference(reference: string): Promise<Booking> {
    const response = await this.getBookingByReference(reference);
    if (!response.ok()) {
      throw new Error(
        `Could not resolve booking ${reference} (${response.status()}): ${await response.text()}`,
      );
    }

    return ((await response.json()) as ApiEnvelope<Booking>).data;
  }

  async bookingsListBody(): Promise<BookingListResponse> {
    const response = await this.listBookings();
    if (!response.ok()) {
      throw new Error(`Could not list bookings (${response.status()}): ${await response.text()}`);
    }

    return (await response.json()) as BookingListResponse;
  }

  async errorBody(response: APIResponse): Promise<ApiError> {
    return (await response.json()) as ApiError;
  }
}
