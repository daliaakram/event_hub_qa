import { randomUUID } from 'node:crypto';
import { LoginPage } from '../../src/pages/login-page';
import { getCredentials } from '../../src/config/environment';
import { expect, test } from '../fixtures/test';

test('logs in with the configured test account', async ({ page }) => {
  const credentials = getCredentials();
  const loginPage = new LoginPage(page);

  await loginPage.open();
  await loginPage.login(credentials.email, credentials.password);

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('user-email-display')).toHaveText(credentials.email);
});

test('rejects login for a non-existent user', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.open();
  await loginPage.login(
    `missing-user-${randomUUID()}@example.com`,
    `Wrong-${randomUUID()}9!`,
  );

  await expect(page.getByText('Invalid email or password')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId('user-email-display')).toHaveCount(0);
});
