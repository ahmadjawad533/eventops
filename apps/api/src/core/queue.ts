import { Queue } from 'bullmq';
import { env } from '../config/env';
import { logger } from './logger';

export const OUTREACH_QUEUE_NAME = 'outreach-campaigns';

let outreachQueueInstance: Queue | null = null;

export function getOutreachQueue(): Queue | null {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  if (!outreachQueueInstance) {
    try {
      outreachQueueInstance = new Queue(OUTREACH_QUEUE_NAME, {
        connection: {
          host: env.REDIS_HOST,
          port: env.REDIS_PORT,
          maxRetriesPerRequest: null,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      });
    } catch (error) {
      logger.warn('Failed to initialize outreach queue', { error });
      return null;
    }
  }

  return outreachQueueInstance;
}
