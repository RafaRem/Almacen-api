import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
} from 'typeorm';
import { UserModule } from '../../common/enums/user-module.enum';

@Entity('user_permissions')
@Unique(['userId', 'module'])
export class UserPermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  module: UserModule;

  @Column({ name: 'can_view', type: 'boolean', default: true })
  canView: boolean;
}
