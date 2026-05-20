import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Cliente } from '../../clientes/entities/cliente.entity';

@Entity('creditos')
export class Credito {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'cliente_id', unique: true })
  clienteId: string;

  @OneToOne(() => Cliente, (cliente) => cliente.credito)
  @JoinColumn({ name: 'cliente_id' })
  cliente: Cliente;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  limite: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'saldo_actual',
    default: 0,
  })
  saldoActual: number;

  @Column({ type: 'int', name: 'id_status', default: 1 })
  idStatus: number;

  @Column({ type: 'int', name: 'fecha_de_corte', default: 15 })
  fechaDeCorte: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
