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
import { Producto } from '../../productos/entities/producto.entity';
import { Lote } from '../../lotes/entities/lote.entity';
import { ProductoPresentacion } from '../../productos/entities/producto-presentacion.entity';

@Entity('lote_precios')
@Index('uq_lote_precio_presentacion', ['loteId', 'presentacionId'], {
  unique: true,
})
export class LotePrecio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'productoid' })
  productoId: string;

  @ManyToOne(() => Producto, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productoid' })
  producto: Producto;

  @Column({ type: 'uuid', name: 'loteid' })
  loteId: string;

  @ManyToOne(() => Lote, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loteid' })
  lote: Lote;

  @Column({ type: 'uuid', name: 'presentacionid' })
  presentacionId: string;

  @ManyToOne(() => ProductoPresentacion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'presentacionid' })
  presentacion: ProductoPresentacion;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'precio_venta',
  })
  precioVenta: number;

  @Column({ type: 'smallint', name: 'status_id', default: 1 })
  statusId: number;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @Column({ type: 'uuid', name: 'updated_by', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
