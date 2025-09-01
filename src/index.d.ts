import 'express-serve-static-core';
import { AuthUser } from './middlewares/auth';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}





