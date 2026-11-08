import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FacturaGlobalDetalle } from './factura-global-detalle.entity';

export enum FacturaGlobalEstado {
  BORRADOR = 'BORRADOR',
  TIMBRADA = 'TIMBRADA',
  CANCELADA = 'CANCELADA',
}

@Entity('factura_global')
export class FacturaGlobal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 2 })
  periodicidad: string;

  @Column({ type: 'varchar', length: 50, default: 'publicoGeneral' })
  variante: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  serie: string;

  @Column({ type: 'int', nullable: true })
  folio: number;

  @Column({ type: 'date', name: 'fecha_inicio' })
  fechaInicio: string;

  @Column({ type: 'date', name: 'fecha_fin' })
  fechaFin: string;

  @Column({ type: 'varchar', length: 2 })
  mes: string;

  @Column({ type: 'int' })
  anio: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  impuestos: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'varchar', length: 36, nullable: true })
  uuid: string;

  @Column({ type: 'varchar', length: 64, name: 'facturapi_id', nullable: true })
  facturapiId: string;

  @Column({ type: 'varchar', length: 500, name: 'xml_path', nullable: true })
  xmlPath: string;

  @Column({ type: 'varchar', length: 500, name: 'pdf_path', nullable: true })
  pdfPath: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: FacturaGlobalEstado.BORRADOR,
  })
  estado: FacturaGlobalEstado;

  @Column({ type: 'timestamp', name: 'fecha_timbrado', nullable: true })
  fechaTimbrado: Date;

  @Column({
    type: 'varchar',
    length: 2,
    name: 'cancelacion_motivo',
    nullable: true,
  })
  cancelacionMotivo: string;

  @Column({ type: 'timestamp', name: 'fecha_cancelacion', nullable: true })
  fechaCancelacion: Date;

  @Column({ type: 'uuid', name: 'usuario_id', nullable: true })
  usuarioId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => FacturaGlobalDetalle, (detalle) => detalle.facturaGlobal, {
    cascade: true,
  })
  detalles: FacturaGlobalDetalle[];
}
