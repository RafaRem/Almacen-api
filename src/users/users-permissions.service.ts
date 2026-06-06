import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPermission } from './entities/user-permission.entity';
import { User, UserTipo } from './entities/user.entity';
import { UserModule } from '../common/enums/user-module.enum';
import { ROLE_DEFAULT_PERMISSIONS } from './constants/default-permissions';

@Injectable()
export class UsersPermissionsService {
  constructor(
    @InjectRepository(UserPermission)
    private permissionsRepository: Repository<UserPermission>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async getPermissionsForUser(userId: string): Promise<UserPermission[]> {
    return this.permissionsRepository.find({
      where: { userId },
    });
  }

  async setPermissionsForUser(
    userId: string,
    modules: UserModule[],
  ): Promise<void> {
    await this.permissionsRepository.delete({ userId });

    if (modules.length === 0) {
      return;
    }

    const permissions = modules.map((module) =>
      this.permissionsRepository.create({
        userId,
        module,
        canView: true,
      }),
    );

    await this.permissionsRepository.save(permissions);
  }

  async createDefaultPermissions(
    userId: string,
    userTipo: UserTipo = UserTipo.USER,
  ): Promise<void> {
    const modules =
      ROLE_DEFAULT_PERMISSIONS[userTipo] ||
      ROLE_DEFAULT_PERMISSIONS[UserTipo.USER];
    const permissions = modules.map((module) =>
      this.permissionsRepository.create({
        userId,
        module,
        canView: true,
      }),
    );

    await this.permissionsRepository.save(permissions);
  }

  async deletePermissionsForUser(userId: string): Promise<void> {
    await this.permissionsRepository.delete({ userId });
  }
}
