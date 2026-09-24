import { z } from 'zod';
import {
  EventCategory,
  EventFormat,
  EventStatus,
  RegistrationStatus,
} from '@eventops/shared-types';

export const createEventSchema = z.object({
  organizer_org_id: z.string().uuid('Valid organizer organization UUID required'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required'),
  category: z.nativeEnum(EventCategory),
  format: z.nativeEnum(EventFormat),
  start_date: z.string().datetime('Valid ISO date-time string required for start_date'),
  end_date: z.string().datetime('Valid ISO date-time string required for end_date'),
  location: z.string().max(255).optional(),
  capacity: z.number().int().min(1, 'Capacity must be at least 1'),
});

export const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  category: z.nativeEnum(EventCategory).optional(),
  format: z.nativeEnum(EventFormat).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  location: z.string().max(255).optional(),
  capacity: z.number().int().min(1).optional(),
  status: z.nativeEnum(EventStatus).optional(),
});

export const checkInSchema = z.object({
  qrPayload: z.string().optional(),
  ticketCode: z.string().optional(),
  targetStatus: z.nativeEnum(RegistrationStatus).optional(),
});

export const eventListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  category: z.nativeEnum(EventCategory).optional(),
  format: z.nativeEnum(EventFormat).optional(),
  status: z.nativeEnum(EventStatus).optional(),
  location: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  organizer_org_id: z.string().uuid().optional(),
});
