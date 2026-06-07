import { SetMetadata } from '@nestjs/common';
import { UserModule } from '../enums/user-module.enum';

export const REQUIRED_PERMISSION_KEY = 'requiredPermission';
export const RequirePermission = (module: UserModule) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, module);
