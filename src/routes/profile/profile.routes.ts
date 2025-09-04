import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { getProfile, updateProfile } from '../../modules/profile/profile.controller';

export const profileRouter = Router();

profileRouter.get('/profile', auth(), getProfile);
profileRouter.patch('/profile', auth(), updateProfile);










