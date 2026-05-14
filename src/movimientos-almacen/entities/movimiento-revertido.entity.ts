import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Producto } from '../../productos/entities/producto.entity';
import { Lote } from '../../lotes/entities/lote.entity';
import { User } from '../../users/entities/user.entity';

export enum TipoReversion {
  FAILED_BATCH = 'FAILED_BATCH',
  MANUAL_REVERSION = 'MANUAL_REVERSION',
  ROLLBACK = 'ROLLBACK',
  CANCELACION = 'CANCELACION',
}

export enum OrigenOperacion {
  POS = 'POS',
  WEB = 'WEB',
  API = 'API',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
}

@Entity('movimientos_revertidos')
export class MovimientoRevertido {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'movimiento_original_id', nullable: true })
  movimientoOriginalId: string;

  @Column({ name: 'producto_id' })
  productoId: string;

  @Column({ name: 'lote_id' })
  loteId: string;

  @Column({ name: 'almacen_origen', type: 'int' })
  almacenOrigen: number;

  @Column({ name: 'almacen_destino', type: 'int' })
  almacenDestino: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cantidad: number;

  @Column({ name: 'tipo_reversion', type: 'varchar', length: 50 })
  tipoReversion: string;

  @Column({ name: 'estado', type: 'varchar', length: 50, default: 'pendiente' })
  estado: string;

  @Column({ length: 500, nullable: true })
  motivo: string;

  @Column({ name: 'error_details', type: 'text', nullable: true })
  errorDetails: string;

  @Column({ name: 'user_id_ejecuto' })
  userIdEjecuto: string;

  @Column({ name: 'revertido_por', nullable: true })
  userIdRevirtio: string;

  @Column({ name: 'reversion_automatica', default: false })
  reversionAutomatica: boolean;

  @Column({ name: 'sucursal_id', nullable: true })
  sucursalId: string;

  @Column({ length: 50, nullable: true })
  turno: string;

  @Column({ length: 50, nullable: true })
  caja: string;

  @Column({ name: 'terminal_id', length: 100, nullable: true })
  terminalId: string;

  @Column({ name: 'session_id', length: 100, nullable: true })
  sessionId: string;

  @Column({
    name: 'origen_operacion',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  origenOperacion: string;

  @Column({ name: 'referencia_externa', length: 255, nullable: true })
  referenciaExterna: string;

  @Column({ name: 'compensado', default: false })
  compensado: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({
    name: 'fecha_operacion_original',
    type: 'timestamp',
    nullable: true,
  })
  fechaOperacionOriginal: Date;

  @Column({ name: 'fecha_reversion', type: 'timestamp', nullable: true })
  fechaReversion: Date;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @ManyToOne(() => Lote)
  @JoinColumn({ name: 'lote_id' })
  lote: Lote;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id_ejecuto' })
  userEjecuto: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'revertido_por' })
  userRevirtio: User;
}
