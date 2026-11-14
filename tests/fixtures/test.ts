import { randomInt } from 'node:crypto';
import {
  expect,
  request as playwrightRequest,
  test as base,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { EventHubApi } from '../../src/api/eventhub-api';
import type { Event } from '../../src/api/types';
import { apiRootUrl, getCredentials } from '../../src/config/environment';
import { LoginPage } from '../../src/pages/login-page';

class BookingCleanup {
  private readonly bookingIds = new Set<number>();

  constructor(private readonly api: EventHubApi) {}

  track(id: number) {
    this.bookingIds.add(id);
  }

  untrack(id: number) {
    this.bookingIds.delete(id);
  }

  async cleanup() {
    for (const id of this.bookingIds) {
      const response = await this.api.cancelBooking(id);
      if (!response.ok() && response.status() !== 404) {
        throw new Error(
          `Failed to clean up booking ${id} (${response.status()}): ${await response.text()}`,
        );
      }
    }
  }
}

interface Fixtures {
  api: EventHubApi;
  authenticatedPage: Page;
  bookableEventIndex: number | undefined;
  bookableEvent: Event;
  bookingCleanup: BookingCleanup;
  anonymousApi: APIRequestContext;
}

export const test = base.extend<Fixtures>({
  bookableEventIndex: [undefined, { option: true }],

  api: async ({}, use) => {
    const credentials = getCredentials();
    const unauthenticated = await playwrightRequest.newContext({ baseURL: apiRootUrl });
    const loginResponse = await unauthenticated.post('auth/login', { data: credentials });

    if (!loginResponse.ok()) {
      const details = await loginResponse.text();
      await unauthenticated.dispose();
      throw new Error(
        `Test account authentication failed (${loginResponse.status()}): ${details}`,
      );
    }

    const { token } = (await loginResponse.json()) as { token: string };
    await unauthenticated.dispose();
    const request = await playwrightRequest.newContext({
      baseURL: apiRootUrl,
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });

    await use(new EventHubApi(request));
    await request.dispose();
  },

  authenticatedPage: async ({ page }, use) => {
    const credentials = getCredentials();
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(credentials.email, credentials.password);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('user-email-display')).toHaveText(credentials.email);
    await use(page);
  },

  bookableEvent: async ({ api, bookableEventIndex }, use) => {
    const events = (await api.listEvents()).filter(candidate => candidate.availableSeats >= 1);
    if (events.length === 0) {
      throw new Error('The authenticated EventHub account has no event with at least one seat.');
    }

    const eventsWithCapacity = events.filter(event => event.availableSeats >= 10);
    const selectableEvents =
      bookableEventIndex === undefined && eventsWithCapacity.length > 0
        ? eventsWithCapacity
        : events;
    const selectedIndex = bookableEventIndex ?? randomInt(selectableEvents.length);
    const event = bookableEventIndex === undefined ? selectableEvents[selectedIndex] : events[selectedIndex];
    if (!event) {
      throw new Error(
        `The authenticated EventHub account has no event with at least one seat at index ${selectedIndex}.`,
      );
    }

    await use(event);
  },

  bookingCleanup: async ({ api }, use) => {
    const cleanup = new BookingCleanup(api);
    await use(cleanup);
    await cleanup.cleanup();
  },

  anonymousApi: async ({}, use) => {
    const context = await playwrightRequest.newContext({ baseURL: apiRootUrl });
    await use(context);
    await context.dispose();
  },
});

export { expect };
