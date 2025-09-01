import { Request, Response, NextFunction } from 'express';
import { httpRequestCounter, httpRequestDuration } from '../config/metrics';

export function metricsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    // Track request start
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000; // Convert to seconds
      const endpoint = req.route?.path || req.path;
      
      // Increment request counter
      httpRequestCounter.inc({
        method: req.method,
        status: res.statusCode.toString(),
        endpoint: endpoint || 'unknown'
      });
      
      // Record request duration
      httpRequestDuration.observe({
        method: req.method,
        status: res.statusCode.toString(),
        endpoint: endpoint || 'unknown'
      }, duration);
    });
    
    next();
  };
}
