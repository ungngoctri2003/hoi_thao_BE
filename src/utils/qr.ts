import { randomUUID } from 'crypto';

export function generateRegistrationQr(confId: number, attendeeId: number) {
  const rand = randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
  return `REG-${confId}-${attendeeId}-${rand}`;
}





