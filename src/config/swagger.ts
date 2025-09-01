import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import path from 'path';
import fs from 'fs';

export function setupSwagger(app: Express) {
  const specPath = path.join(process.cwd(), 'src', 'docs', 'openapi.json');
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
}


