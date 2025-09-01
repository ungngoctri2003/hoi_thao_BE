import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function comparePassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export function signAccessToken(payload: object) {
  const secret: Secret = process.env.JWT_ACCESS_SECRET as Secret;
  const options: SignOptions = { expiresIn: (process.env.JWT_ACCESS_TTL || '15m') as any };
  return jwt.sign(payload, secret, options);
}

export function signRefreshToken(payload: object) {
  const secret: Secret = process.env.JWT_REFRESH_SECRET as Secret;
  const options: SignOptions = { expiresIn: (process.env.JWT_REFRESH_TTL || '7d') as any };
  return jwt.sign(payload, secret, options);
}

export function verifyToken(token: string, type: 'access' | 'refresh') {
  const secret = type === 'access' ? process.env.JWT_ACCESS_SECRET! : process.env.JWT_REFRESH_SECRET!;
  return jwt.verify(token, secret);
}


