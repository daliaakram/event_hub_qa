export interface Credentials {
  email: string;
  password: string;
}

export const appBaseUrl =
  process.env.APP_BASE_URL ?? 'https://eventhub.rahulshettyacademy.com';
export const apiBaseUrl =
  process.env.API_BASE_URL ?? 'https://api.eventhub.rahulshettyacademy.com/api';
export const apiRootUrl = `${apiBaseUrl.replace(/\/+$/, '')}/`;

export function getCredentials(): Credentials {
  const { EVENTHUB_EMAIL: email, EVENTHUB_PASSWORD: password } = process.env;

  if (!email || !password) {
    throw new Error(
      'Set EVENTHUB_EMAIL and EVENTHUB_PASSWORD in .env before running authenticated tests.',
    );
  }

  return { email, password };
}
