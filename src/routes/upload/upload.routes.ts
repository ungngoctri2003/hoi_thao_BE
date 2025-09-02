import { Router } from 'express';
import { uploadImage } from '../../modules/upload/upload.controller';

export const uploadRouter = Router();

// Public upload endpoint
uploadRouter.post('/image', uploadImage);
