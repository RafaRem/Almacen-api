import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StatusId } from '../../common/enums/status-id.enum';
import { Laboratorio } from '../../laboratorios/entities/laboratorio.entity';
import { Recepcion } from '../../recepciones/entities/recepcion.entity';
import { InventarioAlmacen } from '../../inventario-almacen/entities/inventario-almacen.entity';

@Entity('lotes')
export class Lote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  numeroLote: string;

  @Column({ type: 'date' })
  fechaCaducidad: Date;

  @Column()
  laboratorioId: string;

  @ManyToOne(() => Laboratorio)
  @JoinColumn({ name: 'laboratorioId' })
  laboratorio: Laboratorio;

  @Column({ nullable: true })
  recepcionId: string;

  @ManyToOne(() => Recepcion, { nullable: true })
  @JoinColumn({ name: 'recepcionId' })
  recepcion: Recepcion;

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

  @OneToMany(() => InventarioAlmacen, (inv) => inv.lote)
  inventarioAlmacen: InventarioAlmacen[];
}
