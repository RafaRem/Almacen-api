import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CuentaPorCobrar } from '../../cuentas-cobrar/entities/cuenta-cobrar.entity';
import { User } from '../../users/entities/user.entity';

@Entity('abono')
export class Abono {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'cuenta_cobrar_id' })
  cuentaCobrarId: string;

  @ManyToOne(() => CuentaPorCobrar, (cuenta) => cuenta.abonos)
  @JoinColumn({ name: 'cuenta_cobrar_id' })
  cuentaCobrar: CuentaPorCobrar;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  monto: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  excedente: number;

  @CreateDateColumn({ name: 'fecha' })
  fecha: Date;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ type: 'uuid', name: 'usuario_id', nullable: true })
  usuarioId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
