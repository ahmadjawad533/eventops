import { z } from 'zod';
import { RoleType } from '@eventops/shared-types';

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  interests: z.array(z.string().min(1).max(50)).optional(),
  avatar_url: z.string().url().nullable().optional(),
});

export const assignRoleSchema = z.object({
  role_type: z.nativeEnum(RoleType),
  org_id: z.string().uuid().optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
