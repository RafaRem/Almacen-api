import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { CategoriaCliente } from '../../categorias-cliente/entities/categoria-cliente.entity';
import { Telefono } from '../../telefonos/entities/telefono.entity';
import { Domicilio } from '../../domicilios/entities/domicilio.entity';
import { FacturacionCliente } from '../../facturacion-cliente/entities/facturacion-cliente.entity';
import { Credito } from '../../creditos/entities/credito.entity';

export type TipoPersona = 'fisica' | 'moral';

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  apellidoPaterno: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  apellidoMaterno: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  rfc: string;

  @Column({ type: 'uuid', name: 'categoriaclienteid', nullable: true })
  categoriaClienteId: string;

  @ManyToOne(() => CategoriaCliente, { nullable: true })
  @JoinColumn({ name: 'categoriaclienteid' })
  categoriaCliente: CategoriaCliente;

  @Column({ type: 'int', name: 'statusid', default: 1 })
  statusId: number;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'tipo_persona' })
  tipoPersona: TipoPersona;

  @Column({ type: 'varchar', length: 255, nullable: true })
  empresa: string;

  @CreateDateColumn({ name: 'createdat' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedat' })
  updatedAt: Date;

  @OneToMany(() => Telefono, (telefono) => telefono.cliente)
  telefonos: Telefono[];

  @OneToOne(() => Domicilio, (domicilio) => domicilio.cliente)
  domicilio: Domicilio;

  @OneToOne(() => FacturacionCliente, (fc) => fc.cliente)
  facturacionCliente: FacturacionCliente;

  @OneToOne(() => Credito, (credito) => credito.cliente)
  credito: Credito;
}
