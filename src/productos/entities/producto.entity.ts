import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StatusId } from '../../common/enums/status-id.enum';
import { Laboratorio } from '../../laboratorios/entities/laboratorio.entity';

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
    precision: 5,
    scale: 2,
    nullable: true,
  })
  margenRecomendado: number | null;

  @Column({ nullable: true })
  claveProdServ: string;

  @Column({ nullable: true })
  claveUnidad: string;

  @Column({
    type: 'enum',
    enum: StatusId,
    default: StatusId.ACTIVE,
  })
  statusId: StatusId;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
