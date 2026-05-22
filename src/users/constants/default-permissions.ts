import { UserModule } from '../../common/enums/user-module.enum';
import { UserTipo } from '../entities/user.entity';

export const ROLE_DEFAULT_PERMISSIONS: Record<UserTipo, UserModule[]> = {
  [UserTipo.ADMIN]: Object.values(UserModule),
  [UserTipo.USER]: [
    UserModule.DASHBOARD,
    UserModule.PUNTO_VENTA,
    UserModule.REPORTS,
  ],
  [UserTipo.CAJA]: [
    UserModule.PUNTO_VENTA,
    UserModule.INVENTORY,
    UserModule.SUPPLIERS,
    UserModule.BATCHES,
    UserModule.WAREHOUSE,
    UserModule.RECEPTION,
  ],
};
