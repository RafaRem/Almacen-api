import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { Venta } from '../../ventas/entities/venta.entity';
import { Abono } from '../../abonos/entities/abono.entity';

export enum StatusCuentaCobrar {
  PENDIENTE = 1,
  PAGADA = 2,
  VENCIDA = 3,
  CANCELADA = 4,
}

@Entity('cuenta_por_cobrar')
export class CuentaPorCobrar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'cliente_id' })
  clienteId: string;

  @ManyToOne(() => Cliente)
  @JoinColumn({ name: 'cliente_id' })
  @Exclude()
  cliente: Cliente;

  @Column({ type: 'uuid', name: 'venta_id', nullable: true })
  ventaId: string;

  @ManyToOne(() => Venta, { nullable: true })
  @JoinColumn({ name: 'venta_id' })
  @Exclude()
  venta: Venta;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'monto_original',
  })
  montoOriginal: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'monto_pendiente',
  })
  montoPendiente: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'credito_a_favor',
    default: 0,
  })
  creditoAFavor: number;

  @Column({
    type: 'int',
    name: 'id_status',
    default: StatusCuentaCobrar.PENDIENTE,
  })
  idStatus: StatusCuentaCobrar;

  @Column({ type: 'date', name: 'fecha_vencimiento', nullable: true })
  fechaVencimiento: Date;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @OneToMany(() => Abono, (abono) => abono.cuentaCobrar)
  @Exclude()
  abonos: Abono[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
