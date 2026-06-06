import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserModule } from '../enums/user-module.enum';
import { REQUIRED_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { UsersPermissionsService } from '../../users/users-permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersPermissionsService: UsersPermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModule = this.reflector.getAllAndOverride<UserModule>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredModule) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    if (user.tipo === 'admin') {
      return true;
    }

    const permissions = await this.usersPermissionsService.getPermissionsForUser(
      user.id,
    );

    const hasPermission = permissions.some(
      (p) => p.module === requiredModule && p.canView,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Permiso requerido: ${requiredModule}`,
      );
    }

    return true;
  }
}
