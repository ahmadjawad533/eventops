import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RoleType } from '@eventops/shared-types';
import { env } from '../config/env';

export interface JwtUserPayload {
  id: string;
  email: string;
  roles: RoleType[];
  name: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateTokens(payload: JwtUserPayload) {
  const accessToken = jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      roles: payload.roles,
      name: payload.name,
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN as any }
  );

  const refreshToken = jwt.sign(
    {
      id: payload.id,
      email: payload.email,
    },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  };
}

export function verifyAccessToken(token: string): JwtUserPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtUserPayload;
}

export function verifyRefreshToken(token: string): { id: string; email: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: string; email: string };
}
