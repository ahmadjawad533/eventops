import { z } from 'zod';
import { RoleType } from '@eventops/shared-types';

export const registerSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(1, 'Name is required').max(100),
  roles: z.array(z.nativeEnum(RoleType)).optional(),
  interests: z.array(z.string()).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});
