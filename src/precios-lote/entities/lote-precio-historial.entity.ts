import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('lote_precio_historial')
export class LotePrecioHistorial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'lote_precio_id' })
  lotePrecioId: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'precio_anterior',
    nullable: true,
  })
  precioAnterior: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'precio_nuevo',
  })
  precioNuevo: number;

  @Column({ type: 'uuid', name: 'usuario_id', nullable: true })
  usuarioId: string | null;

  @Column({ type: 'varchar', length: 250, nullable: true })
  motivo: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
