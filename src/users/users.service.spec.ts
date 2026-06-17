import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { User, UserStatusId, UserTipo } from './entities/user.entity';
import { UsersPermissionsService } from './users-permissions.service';
import { UsersService } from './users.service';
import {
  createMockRepository,
  MockRepository,
} from '../test-utils/mock-repository';

describe('UsersService', () => {
  let service: UsersService;
  let repository: MockRepository<User>;
  let permissionsService: {
    createDefaultPermissions: jest.Mock;
    deletePermissionsForUser: jest.Mock;
  };

  const user: User = {
    id: 'user-1',
    name: 'Admin User',
    email: 'admin@example.com',
    username: 'admin',
    password: 'hashed-password',
    provisionalPassword: null,
    tipo: UserTipo.ADMIN,
    statusId: UserStatusId.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    permissionsService = {
      createDefaultPermissions: jest.fn().mockResolvedValue(undefined),
      deletePermissionsForUser: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository<User>(),
        },
        {
          provide: UsersPermissionsService,
          useValue: permissionsService,
        },
      ],
    }).compile();

    service = module.get(UsersService);
    repository = module.get(getRepositoryToken(User));
  });

  it('creates a user with a hashed password and default permissions', async () => {
    repository.findOne?.mockResolvedValue(null);
    repository.create?.mockImplementation((entity: Partial<User>) => entity);
    repository.save?.mockImplementation((entity: User) =>
      Promise.resolve({
        ...entity,
        id: user.id,
        tipo: entity.tipo ?? UserTipo.USER,
        statusId: entity.statusId ?? UserStatusId.ACTIVE,
      }),
    );

    const result = await service.create({
      name: 'Admin User',
      email: 'admin@example.com',
      username: 'admin',
      password: 'plain-password',
      tipo: UserTipo.ADMIN,
    });

    expect(result.password).not.toBe('plain-password');
    await expect(
      bcrypt.compare('plain-password', result.password),
    ).resolves.toBe(true);
    expect(permissionsService.createDefaultPermissions).toHaveBeenCalledWith(
      user.id,
      UserTipo.USER,
    );
  });

  it('rejects duplicate email or username', async () => {
    repository.findOne?.mockResolvedValue(user);

    await expect(
      service.create({
        name: user.name,
        email: user.email,
        username: user.username,
        password: 'plain-password',
      }),
    ).rejects.toThrow(ConflictException);

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('throws when a user cannot be found by id', async () => {
    repository.findOne?.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('deletes permissions before removing the user', async () => {
    repository.findOne?.mockResolvedValue(user);

    await service.remove(user.id);

    expect(permissionsService.deletePermissionsForUser).toHaveBeenCalledWith(
      user.id,
    );
    expect(repository.remove).toHaveBeenCalledWith(user);
  });
});
