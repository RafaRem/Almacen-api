import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DescuentoTipo } from '../../common/enums/descuento-tipo.enum';

@Entity('descuentos_venta_detalle')
export class DescuentoVentaDetalle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'detalleVentaId' })
  detalleVentaId: string;

  @Column({ name: 'descuentoId', nullable: true })
  descuentoId: string;

  @Column({ name: 'productoId' })
  productoId: string;

  @Column({
    type: 'enum',
    enum: DescuentoTipo,
  })
  tipo: DescuentoTipo;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  porcentaje: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monto: number;

  @Column({ name: 'motivoGenerado', type: 'text', nullable: true })
  motivoGenerado: string;

  @CreateDateColumn()
  createdAt: Date;
}
