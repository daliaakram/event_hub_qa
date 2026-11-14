import { expect, type Locator, type Page } from '@playwright/test';

export class MyBookingsPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/bookings');
    await expect(this.page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();
  }

  bookingCard(reference: string): Locator {
    return this.page.getByTestId('booking-card').filter({ hasText: reference });
  }

  async cancel(reference: string) {
    const card = this.bookingCard(reference);
    await card.getByTestId('cancel-booking-btn').click();
    await this.page.getByTestId('confirm-dialog-yes').click();
    await expect(card).toHaveCount(0);
  }
}
