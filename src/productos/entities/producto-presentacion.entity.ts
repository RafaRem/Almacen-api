import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Producto } from './producto.entity';
import { StatusId } from '../../common/enums/status-id.enum';
import { PresentacionTipo } from '../../common/enums/presentacion-tipo.enum';

@Entity('producto_presentaciones')
@Index('uq_presentacion_producto_tipo', ['productoId', 'tipo'], {
  unique: true,
})
export class ProductoPresentacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'productoid' })
  productoId: string;

  @ManyToOne(() => Producto, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productoid' })
  producto: Producto;

  @Column({ length: 80 })
  nombre: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  alias: string | null;

  @Column({ type: 'enum', enum: PresentacionTipo })
  tipo: PresentacionTipo;

  @Column({ name: 'factor_unidades', type: 'int' })
  factorUnidades: number;

  @Column({ name: 'codigo_barras', type: 'varchar', nullable: true, unique: true })
  codigoBarras: string | null;

  @Column({ name: 'es_default', default: false })
  esDefault: boolean;

  @Column({
    name: 'statusid',
    type: 'enum',
    enum: StatusId,
    default: StatusId.ACTIVE,
  })
  statusId: StatusId;

  @CreateDateColumn({ name: 'createdat' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedat' })
  updatedAt: Date;
}
