import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DetalleVenta } from './detalle-venta.entity';
import { Lote } from '../../lotes/entities/lote.entity';

@Entity('detalle_venta_lote')
export class DetalleVentaLote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'detalleventaid' })
  detalleVentaId: string;

  @ManyToOne(() => DetalleVenta, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'detalleventaid' })
  detalleVenta: DetalleVenta;

  @Column({ type: 'uuid', name: 'loteid' })
  loteId: string;

  @ManyToOne(() => Lote)
  @JoinColumn({ name: 'loteid' })
  lote: Lote;

  @Column({ type: 'int', name: 'cantidad' })
  cantidad: number;
}
