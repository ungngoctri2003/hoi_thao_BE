import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { getBadges, evaluateBadges } from '../../modules/badges/badges.controller';

export const badgesRouter = Router();

badgesRouter.get('/badges/attendees/:id', auth(), rbac('conferences.read'), getBadges);
badgesRouter.post('/badges/attendees/:id/evaluate', auth(), rbac('conferences.read'), evaluateBadges);










