import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Venta } from './venta.entity';
import { Producto } from '../../productos/entities/producto.entity';
import { Lote } from '../../lotes/entities/lote.entity';

@Entity('detalle_venta')
export class DetalleVenta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'ventaid' })
  ventaId: string;

  @ManyToOne(() => Venta, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ventaid' })
  venta: Venta;

  @Column({ type: 'uuid', name: 'productoid' })
  productoId: string;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'productoid' })
  producto: Producto;

  @Column({ type: 'uuid', name: 'loteid' })
  loteId: string;

  @ManyToOne(() => Lote)
  @JoinColumn({ name: 'loteid' })
  lote: Lote;

  @Column({ type: 'int', name: 'cantidad' })
  cantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'preciounitario' })
  precioUnitario: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'descuentolinea', default: 0 })
  descuentoLinea: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'subtotal' })
  subtotal: number;
}
