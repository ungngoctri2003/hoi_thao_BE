import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { createFrontendAuditLog } from '../../modules/audit/frontend-audit.controller';

export const frontendAuditRouter = Router();

// Create frontend audit log
frontendAuditRouter.post('/', auth(), createFrontendAuditLog);
