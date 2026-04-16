import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StatusId } from '../../common/enums/status-id.enum';

@Entity('laboratorios')
export class Laboratorio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  descripcion: string;

  @Column({ unique: true, nullable: true })
  rfc: string;

  @Column({
    type: 'enum',
    enum: StatusId,
    default: StatusId.ACTIVE,
  })
  statusId: StatusId;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}