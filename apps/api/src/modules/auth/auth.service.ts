import { RoleType, RegisterDto, LoginDto } from '@eventops/shared-types';
import { AuthRepository, authRepository } from './auth.repository';
import { hashPassword, comparePassword, generateTokens, verifyRefreshToken } from '../../core/auth.utils';
import { AppError } from '../../middleware/errorHandler';

export class AuthService {
  constructor(private readonly repo: AuthRepository = authRepository) {}

  public async register(dto: RegisterDto) {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) {
      throw new AppError('An account with this email already exists.', 409, 'EMAIL_EXISTS');
    }

    const password_hash = await hashPassword(dto.password);
    const user = await this.repo.createUser({
      email: dto.email,
      password_hash,
      name: dto.name,
      interests: dto.interests || [],
    });

    const requestedRoles = dto.roles && dto.roles.length > 0 ? dto.roles : [RoleType.ATTENDEE];
    // De-duplicate roles
    const uniqueRoles = Array.from(new Set(requestedRoles));

    const createdRoles = await Promise.all(
      uniqueRoles.map((role_type) =>
        this.repo.createRole({
          user_id: user.id,
          role_type,
        })
      )
    );

    const rolesList = createdRoles.map((r) => r.role_type as RoleType);

    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      roles: rolesList,
      name: user.name,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        interests: user.interests,
        avatar_url: user.avatar_url,
        created_at: user.created_at.toISOString(),
      },
      roles: createdRoles.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        role_type: r.role_type as RoleType,
        org_id: r.org_id,
        created_at: r.created_at.toISOString(),
      })),
      tokens,
    };
  }

  public async login(dto: LoginDto) {
    const user = await this.repo.findByEmail(dto.email);
    if (!user) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const isValid = await comparePassword(dto.password, user.password_hash);
    if (!isValid) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const rolesList = user.roles.map((r) => r.role_type);

    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      roles: rolesList,
      name: user.name,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        interests: user.interests,
        avatar_url: user.avatar_url,
        created_at: user.created_at.toISOString(),
      },
      roles: user.roles.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        role_type: r.role_type,
        org_id: r.org_id,
        created_at: r.created_at.toISOString(),
      })),
      tokens,
    };
  }

  public async refreshToken(token: string) {
    if (!token) {
      throw new AppError('Refresh token is required.', 400, 'MISSING_REFRESH_TOKEN');
    }

    let payload: { id: string; email: string };
    try {
      payload = verifyRefreshToken(token);
    } catch (e: any) {
      throw new AppError('Invalid or expired refresh token.', 401, 'INVALID_REFRESH_TOKEN');
    }

    const user = await this.repo.findById(payload.id);
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const rolesList = user.roles.map((r) => r.role_type);

    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      roles: rolesList,
      name: user.name,
    });

    return { tokens };
  }

  public async getCurrentUser(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        interests: user.interests,
        avatar_url: user.avatar_url,
        created_at: user.created_at.toISOString(),
      },
      roles: user.roles.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        role_type: r.role_type,
        org_id: r.org_id,
        created_at: r.created_at.toISOString(),
      })),
    };
  }
}

export const authService = new AuthService();
