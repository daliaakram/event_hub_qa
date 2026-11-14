import { expect, type Page } from '@playwright/test';
import type { Event } from '../api/types';

export class BookingPage {
  constructor(private readonly page: Page) {}

  async open(eventId: number) {
    await this.page.goto(`/events/${eventId}`);
  }

  async selectQuantity(quantity: number) {
    const currentQuantity = Number(await this.page.locator('#ticket-count').innerText());
    const buttonName = quantity >= currentQuantity ? '+' : '−';
    const count = Math.abs(quantity - currentQuantity);

    for (let index = 0; index < count; index += 1) {
      await this.page.getByRole('button', { name: buttonName, exact: true }).click();
    }
  }

  async fillCustomer(name: string, email: string, phone: string) {
    await this.page.getByLabel('Full Name').fill(name);
    await this.page.getByTestId('customer-email').fill(email);
    await this.page.getByLabel('Phone Number').fill(phone);
  }

  async confirm() {
    await this.page.getByRole('button', { name: 'Confirm Booking' }).click();
  }

  async expectEvent(event: Event) {
    await expect(this.page.getByRole('heading', { name: event.title, exact: true })).toBeVisible();
  }
}
