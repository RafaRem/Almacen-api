import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UsersPermissionsService } from './users-permissions.service';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersPermissionsController {
  constructor(
    private readonly usersPermissionsService: UsersPermissionsService,
  ) {}

  @Get(':id/permissions')
  async getPermissions(@Param('id') id: string) {
    return this.usersPermissionsService.getPermissionsForUser(id);
  }

  @Put(':id/permissions')
  async setPermissions(
    @Param('id') id: string,
    @Body() updatePermissionsDto: UpdateUserPermissionsDto,
  ) {
    await this.usersPermissionsService.setPermissionsForUser(
      id,
      updatePermissionsDto.modules || [],
    );
    return this.usersPermissionsService.getPermissionsForUser(id);
  }
}
