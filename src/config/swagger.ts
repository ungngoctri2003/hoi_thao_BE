import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import path from 'path';
import fs from 'fs';

export function setupSwagger(app: Express) {
  try {
    const specPath = path.join(process.cwd(), 'src', 'docs', 'openapi.json');
    if (fs.existsSync(specPath)) {
      const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
      app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
    } else {
      console.log('OpenAPI spec not found, skipping Swagger setup');
    }
  } catch (error) {
    console.log('Error setting up Swagger:', error);
  }
}
