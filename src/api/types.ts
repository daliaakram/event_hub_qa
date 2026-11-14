export interface Event {
  id: number;
  title: string;
  price: number;
  availableSeats: number;
  totalSeats: number;
  eventDate: string;
  city: string;
}

export interface BookingInput {
  eventId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quantity: number;
}

export interface Booking {
  id: number;
  eventId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quantity: number;
  totalPrice: number;
  status: 'confirmed' | 'cancelled';
  bookingRef: string;
  event?: Event;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface EventListResponse {
  success: boolean;
  data: Event[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface BookingListResponse {
  success: boolean;
  data: Booking[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  error: string;
  details?: Array<{ field: string; message: string }>;
}
