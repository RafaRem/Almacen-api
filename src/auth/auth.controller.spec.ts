import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserStatusId, UserTipo } from '../users/entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    validateUser: jest.Mock;
    login: jest.Mock;
  };

  const user = {
    id: 'user-1',
    name: 'Admin User',
    email: 'admin@example.com',
    username: 'admin',
    provisionalPassword: null,
    tipo: UserTipo.ADMIN,
    statusId: UserStatusId.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    authService = {
      validateUser: jest.fn(),
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get(AuthController);
  });

  it('returns the login payload when credentials are valid', async () => {
    authService.validateUser.mockResolvedValue(user);
    authService.login.mockReturnValue({
      access_token: 'signed-token',
      user,
    });

    await expect(
      controller.login({
        emailOrUsername: user.email,
        password: 'correct-password',
      }),
    ).resolves.toEqual({
      access_token: 'signed-token',
      user,
    });
  });

  it('rejects invalid credentials', async () => {
    authService.validateUser.mockResolvedValue(null);

    await expect(
      controller.login({
        emailOrUsername: user.email,
        password: 'wrong-password',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
