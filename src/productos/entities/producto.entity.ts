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
import { Lote } from '../../lotes/entities/lote.entity';

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

  @Column()
  loteId: string;

  @ManyToOne(() => Lote)
  @JoinColumn({ name: 'loteId' })
  lote: Lote;

  @Column({ default: 0 })
  stock: number;

  @Column({ default: 10 })
  stockMinimo: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  precio: number;

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