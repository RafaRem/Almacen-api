import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StatusId } from '../../common/enums/status-id.enum';
import { DescuentoTipo } from '../../common/enums/descuento-tipo.enum';

@Entity('descuentos')
export class Descuento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: DescuentoTipo,
  })
  tipo: DescuentoTipo;

  @Column({ type: 'jsonb', nullable: true })
  condiciones: Record<string, any>;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  porcentaje: number;

  @Column({ nullable: true })
  laboratorioId: string;

  @Column({ nullable: true })
  categoriaClienteId: string;

  @Column({ type: 'date', nullable: true })
  fechaInicio: Date;

  @Column({ type: 'date', nullable: true })
  fechaFin: Date;

  @Column({
    type: 'enum',
    enum: StatusId,
    default: StatusId.ACTIVE,
  })
  statusId: StatusId;

  @Column({ default: 0 })
  prioridad: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}