import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum TipoMovimientoCredito {
  CREACION = 'CREACION',
  ACTUALIZACION = 'ACTUALIZACION',
  USO = 'USO',
}

@Entity('movimientos_credito')
export class MovimientoCredito {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'clienteid' })
  clienteId: string;

  @Column({ type: 'uuid', name: 'usuarioid', nullable: true })
  usuarioId: string;

  @Column({
    type: 'enum',
    enum: TipoMovimientoCredito,
    name: 'tipo',
  })
  tipo: TipoMovimientoCredito;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'limiteanterior',
    nullable: true,
  })
  limiteAnterior: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'limitenuevo',
    nullable: true,
  })
  limiteNuevo: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'saldoactualanterior',
    nullable: true,
  })
  saldoActualAnterior: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'saldoactualnuevo',
    nullable: true,
  })
  saldoActualNuevo: number;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @CreateDateColumn({ name: 'createdat' })
  createdAt: Date;
}
