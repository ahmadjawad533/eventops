import { z } from 'zod';
import { OrganizationType } from '@eventops/shared-types';

export const createOrgSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.nativeEnum(OrganizationType, {
    errorMap: () => ({ message: 'Type must be one of: community, company, university, ngo' }),
  }),
  description: z.string().max(1000).optional(),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

export const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

export const verifyOrgSchema = z.object({
  verified: z.boolean(),
});

export const assignAdminSchema = z.object({
  user_id: z.string().uuid('Valid user ID required'),
});

export const orgListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  type: z.nativeEnum(OrganizationType).optional(),
  verified: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  search: z.string().optional(),
});
