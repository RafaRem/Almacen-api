import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CorteCajaVenta } from './corte-caja-venta.entity';

export enum CorteCajaStatus {
  ABIERTA = 'ABIERTA',
  CERRADA = 'CERRADA',
}

@Entity('corte_caja')
export class CorteCaja {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'usuario_id' })
  usuarioId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuario_id' })
  usuario: User;

  @Column({ type: 'timestamp', name: 'fecha_apertura' })
  fechaApertura: Date;

  @Column({ type: 'timestamp', name: 'fecha_cierre', nullable: true })
  fechaCierre: Date | null;

  @Column({
    type: 'enum',
    enum: CorteCajaStatus,
    default: CorteCajaStatus.ABIERTA,
  })
  status: CorteCajaStatus;

  @OneToMany(() => CorteCajaVenta, (cv) => cv.corteCaja)
  ventas: CorteCajaVenta[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
