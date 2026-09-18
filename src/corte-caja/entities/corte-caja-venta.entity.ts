import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CorteCaja } from './corte-caja.entity';
import { Venta } from '../../ventas/entities/venta.entity';

@Entity('corte_caja_venta')
export class CorteCajaVenta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'corte_caja_id' })
  corteCajaId: string;

  @ManyToOne(() => CorteCaja, (cc) => cc.ventas)
  @JoinColumn({ name: 'corte_caja_id' })
  corteCaja: CorteCaja;

  @Column({ type: 'uuid', name: 'venta_id' })
  ventaId: string;

  @ManyToOne(() => Venta)
  @JoinColumn({ name: 'venta_id' })
  venta: Venta;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
