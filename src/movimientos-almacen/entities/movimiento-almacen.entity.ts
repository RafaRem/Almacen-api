import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { AlmacenTipo } from '../../common/enums/almacen-tipo.enum';
import { Producto } from '../../productos/entities/producto.entity';
import { Lote } from '../../lotes/entities/lote.entity';
import { User } from '../../users/entities/user.entity';
import { TipoMovimiento, OrigenOperacion } from '../../common/constants';

@Entity('movimientos_almacen')
export class MovimientoAlmacen {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productoId: string;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'productoId' })
  producto: Producto;

  @Column()
  loteId: string;

  @ManyToOne(() => Lote)
  @JoinColumn({ name: 'loteId' })
  lote: Lote;

  @Column({
    type: 'enum',
    enum: AlmacenTipo,
  })
  almacenOrigen: AlmacenTipo;

  @Column({
    type: 'enum',
    enum: AlmacenTipo,
    nullable: true,
  })
  almacenDestino: AlmacenTipo | null;

  @Column()
  cantidad: number;

  @CreateDateColumn()
  fecha: Date;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  usuario: User;

  @Column({ nullable: true })
  observaciones: string;

  @Column({ default: false })
  revertido: boolean;

  @Column({ name: 'revertido_por', nullable: true })
  revertidoPor: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'revertido_por' })
  usuarioRevirtio: User;

  @Column({ name: 'fecha_reversion', type: 'timestamp', nullable: true })
  fechaReversion: Date;

  @Column({ default: false })
  compensado: boolean;

  @Column({ name: 'tipo_movimiento', length: 50, nullable: true })
  tipoMovimiento: string;

  @Column({ name: 'origen_operacion', length: 20, nullable: true })
  origenOperacion: string;
}