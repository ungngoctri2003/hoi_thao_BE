import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { generateCertificate } from '../../modules/certificates/certificates.controller';

export const certificatesRouter = Router();

certificatesRouter.post('/certificates/generate', auth(), rbac('conferences.read'), generateCertificate);





