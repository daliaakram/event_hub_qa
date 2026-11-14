import { randomUUID } from 'node:crypto';
import { expect, test } from '../fixtures/test';

const passwordNonce = randomUUID().replace(/-/g, '');
const invalidPasswords = [
  { rule: 'minimum length', password: `A1!${passwordNonce.slice(0, 4)}` },
  { rule: 'uppercase letter', password: `a1!${passwordNonce.slice(0, 7)}` },
  { rule: 'number', password: `Ab!${passwordNonce.replace(/[0-9]/g, 'a').slice(0, 8)}` },
  { rule: 'special character', password: `Ab1${passwordNonce.replace(/[^a-f]/g, 'a').slice(0, 8)}` },
];

test('rejects signup passwords that do not meet the requirements', async ({ page }) => {
  let registrationRequests = 0;
  await page.route('**/auth/register', async route => {
    registrationRequests += 1;
    await route.abort();
  });

  for (const { rule, password } of invalidPasswords) {
    await page.goto('/register');
    await page.getByPlaceholder('you@email.com').fill(`signup-${randomUUID()}@example.com`);
    await page.getByPlaceholder('Min 8 chars, uppercase, number & symbol').fill(password);
    await page.getByPlaceholder('Repeat your password').fill(password);
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('Password does not meet the requirements below')).toBeVisible();
    expect(registrationRequests, `a password missing ${rule} should be rejected before submission`)
      .toBe(0);
  }
});

test('rejects an invalid email during signup', async ({ page }) => {
  let registrationRequests = 0;
  await page.route('**/auth/register', async route => {
    registrationRequests += 1;
    await route.abort();
  });

  await page.goto('/register');
  await page.getByPlaceholder('you@email.com').fill(`invalid-email-${randomUUID()}`);
  const password = `EventHub-${randomUUID()}9!`;
  await page.getByPlaceholder('Min 8 chars, uppercase, number & symbol').fill(password);
  await page.getByPlaceholder('Repeat your password').fill(password);
  await page.getByRole('button', { name: 'Create Account' }).click();

  await expect(page.getByText('Enter a valid email')).toBeVisible();
  expect(registrationRequests).toBe(0);
});
