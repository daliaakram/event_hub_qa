import { randomInt } from 'node:crypto';

export function randomCustomerPhone(): string {
  const areaCode = randomInt(200, 1_000);
  const exchangeCode = randomInt(200, 1_000);
  const lineNumber = randomInt(0, 10_000).toString().padStart(4, '0');
  return `+1 ${areaCode} ${exchangeCode} ${lineNumber}`;
}

export function randomInvalidCustomerPhone(): string {
  return randomInt(0, 1_000).toString().padStart(3, '0');
}
