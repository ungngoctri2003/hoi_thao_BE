import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { audit } from '../../middlewares/audit';
import { scan, manual, list } from '../../modules/checkins/checkins.controller';

export const checkinsRouter = Router();

checkinsRouter.post('/scan', auth(), rbac('checkin.process'), audit('conference', 'checkin', 'checkin'), scan);
checkinsRouter.post('/manual', auth(), rbac('checkin.process'), audit('conference', 'checkin-manual', 'checkin'), manual);
checkinsRouter.get('/', auth(), rbac('checkin.process'), list);






