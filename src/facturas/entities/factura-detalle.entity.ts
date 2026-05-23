import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Factura } from './factura.entity';
import { Producto } from '../../productos/entities/producto.entity';
import { Lote } from '../../lotes/entities/lote.entity';

@Entity('factura_detalles')
export class FacturaDetalle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'facturaid' })
  facturaId: string;

  @ManyToOne(() => Factura, (factura) => factura.detalles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'facturaid' })
  factura: Factura;

  @Column({ type: 'uuid', name: 'productoid' })
  productoId: string;

  @ManyToOne(() => Producto, { nullable: true })
  @JoinColumn({ name: 'productoid' })
  producto: Producto;

  @Column({ type: 'uuid', name: 'loteid', nullable: true })
  loteId: string;

  @ManyToOne(() => Lote, { nullable: true })
  @JoinColumn({ name: 'loteid' })
  lote: Lote;

  @Column({ type: 'varchar', length: 50, nullable: true })
  claveProdServ: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  claveUnidad: string;

  @Column({ type: 'varchar', length: 500 })
  descripcion: string;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  cantidad: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  unidad: string;

  @Column({ type: 'decimal', precision: 12, scale: 6 })
  valorUnitario: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuento: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  importe: number;

  @Column({ type: 'jsonb', nullable: true })
  impuestos: {
    base: number;
    impuesto: string;
    tipoFactor: string;
    tasaOCuota: number;
    importe: number;
  }[];

  @CreateDateColumn({ name: 'createdat' })
  createdAt: Date;
}
