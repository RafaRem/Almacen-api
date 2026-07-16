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
import { FacturaDetalle } from './factura-detalle.entity';
import { TipoComprobante } from '../../common/enums/tipo-comprobante.enum';
import { MetodoPagoSat } from '../../common/enums/metodo-pago-sat.enum';

export enum FacturaStatus {
  BORRADOR = 1,
  TIMBRADA = 2,
  CANCELADA = 3,
}

@Entity('facturas')
export class Factura {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  serie: string;

  @Column({ type: 'int', nullable: true })
  folio: number;

  @Column({
    type: 'enum',
    enum: TipoComprobante,
    default: TipoComprobante.INGRESO,
  })
  tipoComprobante: TipoComprobante;

  @Column({ type: 'varchar', length: 5, nullable: true })
  lugarExpedicion: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha: Date;

  @Column({ type: 'varchar', length: 2, nullable: true })
  formaPago: string;

  @Column({
    type: 'enum',
    enum: MetodoPagoSat,
    default: MetodoPagoSat.PUE,
  })
  metodoPago: MetodoPagoSat;

  @Column({ type: 'varchar', length: 3, nullable: true })
  usoCfdi: string;

  @Column({ type: 'varchar', length: 3, default: 'MXN' })
  moneda: string;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 1 })
  tipoCambio: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuentoTotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalImpuestosTrasladados: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalImpuestosRetenidos: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  uuid: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  xmlPath: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  pdfPath: string;

  @Column({
    type: 'int',
    default: FacturaStatus.BORRADOR,
  })
  statusId: FacturaStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  emisorNombre: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  emisorRfc: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  emisorRegimenFiscal: string;

  @Column({ type: 'uuid', name: 'ventaid', nullable: true })
  ventaId: string;

  @Column({ type: 'uuid', name: 'clienteid', nullable: true })
  clienteId: string;

  @ManyToOne(() => Cliente, { nullable: true })
  @JoinColumn({ name: 'clienteid' })
  cliente: Cliente;

  @Column({ type: 'uuid', name: 'usuarioid', nullable: true })
  usuarioId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'usuarioid' })
  usuario: User;

  @OneToMany(() => FacturaDetalle, (detalle) => detalle.factura, {
    cascade: true,
  })
  detalles: FacturaDetalle[];

  @CreateDateColumn({ name: 'createdat' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedat' })
  updatedAt: Date;
}
