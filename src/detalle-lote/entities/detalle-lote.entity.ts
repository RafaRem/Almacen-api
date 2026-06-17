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
import { MovimientoAlmacen } from '../../movimientos-almacen/entities/movimiento-almacen.entity';

@Entity('detalle_lote')
export class DetalleLote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productoId: string;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'productoId' })
  producto: Producto;

  @Column()
  loteId: string;

  @ManyToOne(() => Lote)
  @JoinColumn({ name: 'loteId' })
  lote: Lote;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cantidad: number;

  @Column({ name: 'precio_unitario', type: 'decimal', precision: 10, scale: 2, default: 0 })
  precioUnitario: number;

  @Column({
    name: 'iva_cfdi',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  ivaCfdi: number | null;

  @Column({ type: 'uuid', name: 'movimientoid', nullable: true })
  movimientoId: string;

  @ManyToOne(() => MovimientoAlmacen)
  @JoinColumn({ name: 'movimientoid' })
  movimiento: MovimientoAlmacen;

  @Column({ name: 'almacen_tipo', type: 'int', nullable: true })
  almacenTipo: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}