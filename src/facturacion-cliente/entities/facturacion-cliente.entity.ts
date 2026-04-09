import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { RegimenFiscal } from '../../regimen-fiscal/entities/regimen-fiscal.entity';

@Entity('facturacion_cliente')
export class FacturacionCliente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'cliente_id', unique: true })
  clienteId: string;

  @OneToOne(() => Cliente, cliente => cliente.facturacionCliente)
  @JoinColumn({ name: 'cliente_id' })
  cliente: Cliente;

  @Column({ type: 'varchar', length: 20 })
  rfc: string;

  @Column({ type: 'varchar', length: 255, name: 'razon_social' })
  razonSocial: string;

  @Column({ type: 'varchar', length: 255 })
  correo: string;

  @Column({ type: 'int', name: 'regimen_fiscal_id' })
  regimenFiscalId: number;

  @ManyToOne(() => RegimenFiscal)
  @JoinColumn({ name: 'regimen_fiscal_id' })
  regimenFiscal: RegimenFiscal;

  @Column({ type: 'varchar', length: 3, name: 'uso_cfdi', nullable: true })
  usoCfdi: string;

  @Column({ type: 'int', name: 'status_id', default: 1 })
  statusId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}