import { usersRepository, UsersRepository } from "./users.repository";

export class UsersService {
  constructor(private readonly repo: UsersRepository = usersRepository) {}
}

export const usersService = new UsersService();
