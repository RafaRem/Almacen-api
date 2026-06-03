import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { DetalleVenta } from '../../ventas/entities/detalle-venta.entity';
import { Descuento } from './descuento.entity';
import { Producto } from '../../productos/entities/producto.entity';
import { DescuentoTipo } from '../../common/enums/descuento-tipo.enum';

@Entity('descuentos_venta_detalle')
export class DescuentoVentaDetalle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'detalleventaid' })
  detalleVentaId: string;

  @ManyToOne(() => DetalleVenta, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'detalleventaid' })
  detalleVenta: DetalleVenta;

  @Column({ type: 'uuid', name: 'descuentoid' })
  descuentoId: string;

  @ManyToOne(() => Descuento)
  @JoinColumn({ name: 'descuentoid' })
  descuento: Descuento;

  @Column({ type: 'uuid', name: 'productoid' })
  productoId: string;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'productoid' })
  producto: Producto;

  @Column({ type: 'enum', enum: DescuentoTipo, name: 'tipo' })
  tipo: DescuentoTipo;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'porcentaje' })
  porcentaje: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'monto' })
  monto: number;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'motivogenerado' })
  motivoGenerado: string;

  @CreateDateColumn({ name: 'createdat' })
  createdAt: Date;
}
