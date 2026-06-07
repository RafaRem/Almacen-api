import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersPermissionsService } from './users-permissions.service';
import { UsersController } from './users.controller';
import { UsersPermissionsController } from './users-permissions.controller';
import { User } from './entities/user.entity';
import { UserPermission } from './entities/user-permission.entity';
import { CommonModule } from '../common/common.module';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, UserPermission]), CommonModule],
  controllers: [UsersController, UsersPermissionsController],
  providers: [UsersService, UsersPermissionsService],
  exports: [UsersService, UsersPermissionsService],
})
export class UsersModule {}
