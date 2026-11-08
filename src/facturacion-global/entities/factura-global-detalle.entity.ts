import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FacturaGlobal } from './factura-global.entity';
import { Venta } from '../../ventas/entities/venta.entity';

@Entity('factura_global_detalle')
export class FacturaGlobalDetalle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'factura_global_id' })
  facturaGlobalId: string;

  @ManyToOne(() => FacturaGlobal, (factura) => factura.detalles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'factura_global_id' })
  facturaGlobal: FacturaGlobal;

  @Column({ type: 'uuid', name: 'venta_id' })
  ventaId: string;

  @ManyToOne(() => Venta)
  @JoinColumn({ name: 'venta_id' })
  venta: Venta;

  @Column({ type: 'int' })
  folio: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  iva: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
