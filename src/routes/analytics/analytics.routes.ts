import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import {
  overview,
  conferenceAttendance,
  sessionEngagement,
  networking,
  globalAIAnalytics,
  conferenceAIAnalytics,
} from '../../modules/analytics/analytics.controller';

export const analyticsRouter = Router();

analyticsRouter.get('/analytics/overview', auth(), overview);
analyticsRouter.get(
  '/analytics/conferences/:id/attendance',
  auth(),
  rbac('analytics.view'),
  conferenceAttendance
);
analyticsRouter.get(
  '/analytics/sessions/:id/engagement',
  auth(),
  rbac('analytics.view'),
  sessionEngagement
);
analyticsRouter.get('/analytics/networking', auth(), rbac('analytics.view'), networking);
analyticsRouter.get('/analytics/global-ai', auth(), rbac('analytics.view'), globalAIAnalytics);
analyticsRouter.get(
  '/analytics/conference-ai',
  auth(),
  rbac('analytics.view'),
  conferenceAIAnalytics
);
