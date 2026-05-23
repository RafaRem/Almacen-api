import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Venta } from './venta.entity';
import { FormaPago } from '../../common/enums/forma-pago.enum';

@Entity('pagos_venta')
export class PagoVenta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'ventaid' })
  ventaId: string;

  @ManyToOne(() => Venta, (venta) => venta.pagos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ventaid' })
  venta: Venta;

  @Column({
    type: 'enum',
    enum: FormaPago,
    name: 'formapago',
  })
  formaPago: FormaPago;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  referencia: string | null;

  @CreateDateColumn({ name: 'createdat' })
  createdAt: Date;
}
