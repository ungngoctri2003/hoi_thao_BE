import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { overview, conferenceAttendance, sessionEngagement, networking } from '../../modules/analytics/analytics.controller';

export const analyticsRouter = Router();

analyticsRouter.get('/analytics/overview', auth(), rbac('analytics.read'), overview);
analyticsRouter.get('/analytics/conferences/:id/attendance', auth(), rbac('analytics.read'), conferenceAttendance);
analyticsRouter.get('/analytics/sessions/:id/engagement', auth(), rbac('analytics.read'), sessionEngagement);
analyticsRouter.get('/analytics/networking', auth(), rbac('analytics.read'), networking);















