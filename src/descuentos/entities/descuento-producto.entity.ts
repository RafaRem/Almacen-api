import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StatusId } from '../../common/enums/status-id.enum';
import { Descuento } from './descuento.entity';

@Entity('descuentos_productos')
export class DescuentoProducto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'descuentoId' })
  descuentoId: string;

  @Column({ type: 'uuid', name: 'productoId' })
  productoId: string;

  @Column({ type: 'integer', default: StatusId.ACTIVE })
  statusId: StatusId;

  @ManyToOne(() => Descuento, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'descuentoId' })
  descuento: Descuento;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;
}
