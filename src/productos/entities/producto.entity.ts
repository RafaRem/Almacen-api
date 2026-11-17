import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { StatusId } from '../../common/enums/status-id.enum';
import { EmpaqueEstado } from '../../common/enums/empaque-estado.enum';
import { Laboratorio } from '../../laboratorios/entities/laboratorio.entity';
import { Proveedor } from '../../proveedores/entities/proveedor.entity';
import { ProductoPresentacion } from './producto-presentacion.entity';

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  descripcion: string;

  @Column({ unique: true })
  codigoBarras: string;

  @Column()
  laboratorioId: string;

  @ManyToOne(() => Laboratorio)
  @JoinColumn({ name: 'laboratorioId' })
  laboratorio: Laboratorio;

  @Column({ default: 10 })
  stockMinimo: number;

  @Column({ default: 100 })
  stockMaximo: number;

  @Column({
    name: 'margen_recomendado',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  margenRecomendado: number | null;

  @Column({
    name: 'piezas_por_caja_default',
    type: 'int',
    nullable: true,
  })
  piezasPorCajaDefault: number | null;

  @Column({
    name: 'empaque_estado',
    type: 'enum',
    enum: EmpaqueEstado,
    default: EmpaqueEstado.PENDIENTE_FACTOR,
  })
  empaqueEstado: EmpaqueEstado;

  @Column({ name: 'proveedor_preferido_id', nullable: true })
  proveedorPreferidoId: string;

  @ManyToOne(() => Proveedor, { nullable: true })
  @JoinColumn({ name: 'proveedor_preferido_id' })
  proveedorPreferido: Proveedor;

  @Column({ nullable: true })
  claveProdServ: string;

  @Column({ nullable: true })
  claveUnidad: string;

  @Column({ type: 'varchar', length: 2, default: '00' })
  impuestoAplicado: string;

  @Column({
    type: 'enum',
    enum: StatusId,
    default: StatusId.ACTIVE,
  })
  statusId: StatusId;

  @Column({ type: 'text', array: true, nullable: true, name: 'clases_permitidas' })
  clasesPermitidas: string[] | null;

  @OneToMany(() => ProductoPresentacion, (presentacion) => presentacion.producto)
  presentaciones: ProductoPresentacion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
