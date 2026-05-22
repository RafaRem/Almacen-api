import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserTipo {
  ADMIN = 'admin',
  USER = 'usuario',
  CAJA = 'caja',
}

export enum UserStatusId {
  ACTIVE = 1,
  INACTIVE = 0,
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  provisionalPassword: string;

  @Column({
    type: 'enum',
    enum: UserTipo,
    default: UserTipo.USER,
  })
  tipo: UserTipo;

  @Column({
    type: 'enum',
    enum: UserStatusId,
    default: UserStatusId.ACTIVE,
  })
  statusId: UserStatusId;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
