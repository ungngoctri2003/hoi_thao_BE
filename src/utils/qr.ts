import { randomUUID } from 'crypto';

export function generateRegistrationQr(confId: number, attendeeId: number) {
  const rand = randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `REG-${confId}-${attendeeId}-${timestamp}-${rand}`;
}





