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

@Entity('domicilios')
export class Domicilio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'cliente_id', unique: true })
  clienteId: string;

  @OneToOne(() => Cliente, cliente => cliente.domicilio)
  @JoinColumn({ name: 'cliente_id' })
  cliente: Cliente;

  @Column({ type: 'varchar', length: 255 })
  calle: string;

  @Column({ type: 'varchar', length: 20, name: 'numero_ext' })
  numeroExt: string;

  @Column({ type: 'varchar', length: 20, name: 'numero_int', nullable: true })
  numeroInt: string;

  @Column({ type: 'varchar', length: 255 })
  localidad: string;

  @Column({ type: 'varchar', length: 100 })
  ciudad: string;

  @Column({ type: 'varchar', length: 10, name: 'codigo_postal' })
  codigoPostal: string;

  @Column({ type: 'varchar', length: 100 })
  municipio: string;

  @Column({ type: 'varchar', length: 100 })
  estado: string;

  @Column({ type: 'varchar', length: 100, default: 'México' })
  pais: string;

  @Column({ type: 'int', name: 'status_id', default: 1 })
  statusId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}