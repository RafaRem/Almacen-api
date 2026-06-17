import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { User, UserStatusId, UserTipo } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findByEmail: jest.Mock;
    findByUsername: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
  };

  const baseUser: User = {
    id: 'user-1',
    name: 'Admin User',
    email: 'admin@example.com',
    username: 'admin',
    password: '',
    provisionalPassword: null,
    tipo: UserTipo.ADMIN,
    statusId: UserStatusId.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
    };
    jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('signed-access-token')
        .mockResolvedValueOnce('signed-refresh-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('validates a user by email and removes the password from the result', async () => {
    const password = await bcrypt.hash('correct-password', 10);
    usersService.findByEmail.mockResolvedValue({ ...baseUser, password });
    usersService.findByUsername.mockResolvedValue(null);

    const result = await service.validateUser(
      baseUser.email,
      'correct-password',
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: baseUser.id,
        email: baseUser.email,
        username: baseUser.username,
      }),
    );
    expect(result).not.toHaveProperty('password');
  });

  it('returns null for invalid credentials', async () => {
    const password = await bcrypt.hash('correct-password', 10);
    usersService.findByEmail.mockResolvedValue({ ...baseUser, password });
    usersService.findByUsername.mockResolvedValue(null);

    await expect(
      service.validateUser(baseUser.email, 'wrong-password'),
    ).resolves.toBeNull();
  });

  it('creates a signed login response', async () => {
    const user = {
      id: baseUser.id,
      name: baseUser.name,
      email: baseUser.email,
      username: baseUser.username,
      provisionalPassword: baseUser.provisionalPassword,
      tipo: baseUser.tipo,
      statusId: baseUser.statusId,
      createdAt: baseUser.createdAt,
      updatedAt: baseUser.updatedAt,
    };

    await expect(service.login(user)).resolves.toEqual({
      access_token: 'signed-access-token',
      refresh_token: 'signed-refresh-token',
      user: {
        id: baseUser.id,
        name: baseUser.name,
        email: baseUser.email,
        username: baseUser.username,
        tipo: baseUser.tipo,
      },
    });
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      1,
      {
        email: baseUser.email,
        sub: baseUser.id,
        tipo: baseUser.tipo,
        type: 'access',
      },
      { expiresIn: '2h' },
    );
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      2,
      {
        email: baseUser.email,
        sub: baseUser.id,
        tipo: baseUser.tipo,
        type: 'refresh',
      },
      { expiresIn: '7d' },
    );
  });
});
