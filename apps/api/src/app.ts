import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { apiRouter } from './modules';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): Application {
  const app = express();

  // Security & utility middleware
  app.use(helmet());
  app.use(cors({
    origin: '*',
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  // Root redirect/ping
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      service: 'EventOps API',
      version: '0.1.0',
      status: 'online',
      endpoints: {
        health: '/api/health',
        ready: '/api/health/ready',
      },
    });
  });

  // Mount API routers
  app.use('/api', apiRouter);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
    });
  });

  // Centralized Error handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
