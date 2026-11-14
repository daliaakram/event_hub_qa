import { getCredentials } from '../../src/config/environment';
import { expect, test } from '../fixtures/test';

test('logs in through the API with the configured test account', async ({ anonymousApi }) => {
  const response = await anonymousApi.post('auth/login', { data: getCredentials() });

  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { token?: string, user?: { id: number, email: string }, };
  expect(body.token).toEqual(expect.any(String));
  expect(body.token?.length).toBeGreaterThan(0);
  expect(body.token?.length).toBeGreaterThan(0);
  expect(body.user?.id).toEqual(expect.any(Number));
  expect(body.user?.email).toEqual(getCredentials().email);
});
