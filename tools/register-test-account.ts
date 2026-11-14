import 'dotenv/config';
import { request } from '@playwright/test';
import { apiRootUrl } from '../src/config/environment';

async function main() {
  const email = process.env.EVENTHUB_EMAIL;
  const password = process.env.EVENTHUB_PASSWORD;
  if (!email || !password) {
    throw new Error('Set EVENTHUB_EMAIL and EVENTHUB_PASSWORD in .env before registering.');
  }

  if (
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error(
      'The web app requires a password with at least 8 characters, one uppercase letter, one number, and one special character.',
    );
  }

  const api = await request.newContext({ baseURL: apiRootUrl });
  try {
    const response = await api.post('auth/register', { data: { email, password } });
    const body = await response.json();
    if (!response.ok()) {
      throw new Error(
        `Account registration failed (${response.status()}): ${JSON.stringify(body)}`,
      );
    }

    console.log(`Created EventHub test account: ${body.user.email}`);
    console.log('The public API has no account-deletion endpoint; keep this account for repeated test runs.');
  } finally {
    await api.dispose();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
