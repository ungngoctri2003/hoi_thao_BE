import { Router } from 'express';
import { login, refresh, register, forgotPassword, resetPassword, changePassword } from '../../modules/auth/auth.controller';
import { auth } from '../../middlewares/auth';

export const authRouter = Router();

authRouter.post('/login', login);
authRouter.post('/refresh', refresh);
authRouter.post('/register', register);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);
authRouter.post('/change-password', auth(), changePassword);




