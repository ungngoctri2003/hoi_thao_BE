import { comparePassword, hashPassword, signAccessToken, signRefreshToken, verifyToken } from '../../utils/crypto';
import { usersRepository } from '../users/users.repository';
import { attendeesRepository } from '../attendees/attendees.repository';
import { putToken, getToken, deleteToken } from '../../utils/token-store';

export const authService = {
  async login(email: string, password: string) {
    const user = await usersRepository.findByEmail(email);
    if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    const ok = user.PASSWORD_HASH ? await comparePassword(password, user.PASSWORD_HASH) : false;
    if (!ok) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    const payload = { id: user.ID, email: user.EMAIL };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    await usersRepository.updateLastLogin(user.ID);
    return { accessToken, refreshToken };
  },

  async refresh(refreshToken: string) {
    try {
      const decoded = verifyToken(refreshToken, 'refresh') as any;
      const payload = { id: decoded.id, email: decoded.email };
      return { accessToken: signAccessToken(payload), refreshToken: signRefreshToken(payload) };
    } catch {
      throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
    }
  },

  async register(input: { email: string; name: string; password: string; }) {
    const existing = await usersRepository.findByEmail(input.email);
    if (existing) throw Object.assign(new Error('Email already used'), { status: 409 });
    const passwordHash = await hashPassword(input.password);
    const user = await usersRepository.create({ EMAIL: input.email, NAME: input.name, PASSWORD_HASH: passwordHash });
    const attendee = await attendeesRepository.findByEmail(input.email);
    if (!attendee) {
      await attendeesRepository.create({
        NAME: input.name,
        EMAIL: input.email,
        PHONE: null,
        COMPANY: null,
        POSITION: null,
        AVATAR_URL: null,
        DIETARY: null,
        SPECIAL_NEEDS: null,
        DATE_OF_BIRTH: null,
        GENDER: null
      });
    }
    return { id: user.ID };
  },

  async issuePasswordReset(email: string) {
    const user = await usersRepository.findByEmail(email);
    if (!user) return; // do not leak
    const token = signRefreshToken({ id: user.ID, email: user.EMAIL });
    putToken(`reset:${user.ID}`, token, 1000 * 60 * 10); // 10 minutes
    return { token };
  },

  async resetPassword(token: string, newPassword: string) {
    const decoded = verifyToken(token, 'refresh') as any;
    const rec = getToken(`reset:${decoded.id}`);
    if (!rec || rec.value !== token) throw Object.assign(new Error('Invalid or expired token'), { status: 400 });
    const hash = await hashPassword(newPassword);
    await usersRepository.setPassword(decoded.id, hash);
    deleteToken(`reset:${decoded.id}`);
  }
};


