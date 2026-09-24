import { authRepository, AuthRepository } from "./auth.repository";

export class AuthService {
  constructor(private readonly repo: AuthRepository = authRepository) {}
}

export const authService = new AuthService();
