import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Cliente } from '../../clientes/entities/cliente.entity';

export type TelefonoTipo = 'telefono' | 'celular';

@Entity('telefonos')
export class Telefono {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'cliente_id' })
  clienteId: string;

  @ManyToOne(() => Cliente, cliente => cliente.telefonos)
  @JoinColumn({ name: 'cliente_id' })
  cliente: Cliente;

  @Column({ type: 'varchar', length: 20 })
  tipo: TelefonoTipo;

  @Column({ type: 'varchar', length: 20 })
  numero: string;

  @Column({ type: 'int', name: 'status_id', default: 1 })
  statusId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}