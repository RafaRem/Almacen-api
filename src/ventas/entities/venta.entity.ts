import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { User } from '../../users/entities/user.entity';
import { DetalleVenta } from './detalle-venta.entity';
import { PagoVenta } from './pago-venta.entity';
import { MetodoPago } from '../../common/enums/metodo-pago.enum';

@Entity('ventas')
export class Venta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'clienteid', nullable: true })
  clienteId: string;

  @ManyToOne(() => Cliente, { nullable: true })
  @JoinColumn({ name: 'clienteid' })
  cliente: Cliente;

  @Column({ type: 'uuid', name: 'usuarioid' })
  usuarioId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuarioid' })
  usuario: User;

  @OneToMany(() => DetalleVenta, (detalle) => detalle.venta)
  detalles: DetalleVenta[];

  @OneToMany(() => PagoVenta, (pago) => pago.venta)
  pagos: PagoVenta[];

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'subtotal', default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'descuentoaplicado', default: 0 })
  descuentoAplicado: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'iva', default: 0 })
  iva: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total', default: 0 })
  total: number;

  @Column({
    type: 'enum',
    enum: MetodoPago,
    name: 'metodopago',
    default: MetodoPago.EFECTIVO,
  })
  metodoPago: MetodoPago;

  @Column({ type: 'text', nullable: true, name: 'observaciones' })
  observaciones: string;

  @Column({ type: 'int', name: 'statusid', default: 1 })
  statusId: number;

  @CreateDateColumn({ name: 'createdat' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedat' })
  updatedAt: Date;
}
