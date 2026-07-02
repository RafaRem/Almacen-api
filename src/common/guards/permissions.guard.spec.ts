import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { UserModule } from '../enums/user-module.enum';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let mockReflector: jest.Mocked<Reflector>;
  let mockPermissionsService: { getPermissionsForUser: jest.Mock };
  let mockContext: any;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    mockPermissionsService = {
      getPermissionsForUser: jest.fn(),
    };

    guard = new PermissionsGuard(mockReflector, mockPermissionsService as any);

    mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnThis(),
      getRequest: jest.fn(),
    };
  });

  it('should allow access when no required module', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when no user in request', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(UserModule.INVOICES);
    mockContext.switchToHttp().getRequest.mockReturnValue({});

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should allow admin user without checking permissions', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(UserModule.INVOICES);
    mockContext.switchToHttp().getRequest.mockReturnValue({
      user: { id: 'admin-1', tipo: 'admin' },
    });

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockPermissionsService.getPermissionsForUser).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException when user lacks module permission', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(UserModule.INVOICES);
    mockContext.switchToHttp().getRequest.mockReturnValue({
      user: { id: 'user-1', tipo: 'usuario' },
    });
    mockPermissionsService.getPermissionsForUser.mockResolvedValue([
      { module: UserModule.PUNTO_VENTA, canView: true },
    ]);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should allow user with required module permission', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(UserModule.INVOICES);
    mockContext.switchToHttp().getRequest.mockReturnValue({
      user: { id: 'user-1', tipo: 'usuario' },
    });
    mockPermissionsService.getPermissionsForUser.mockResolvedValue([
      { module: UserModule.INVOICES, canView: true },
    ]);

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockPermissionsService.getPermissionsForUser).toHaveBeenCalledWith(
      'user-1',
    );
  });

  it('should check module permission on class-level decorator', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(UserModule.DISCOUNTS);
    mockContext.switchToHttp().getRequest.mockReturnValue({
      user: { id: 'user-2', tipo: 'usuario' },
    });
    mockPermissionsService.getPermissionsForUser.mockResolvedValue([
      { module: UserModule.DISCOUNTS, canView: true },
    ]);

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
  });
});
