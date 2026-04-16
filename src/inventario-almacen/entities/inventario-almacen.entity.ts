import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AlmacenTipo } from '../../common/enums/almacen-tipo.enum';
import { Producto } from '../../productos/entities/producto.entity';
import { Lote } from '../../lotes/entities/lote.entity';

@Entity('inventario_almacen')
export class InventarioAlmacen {
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
  almacenTipo: AlmacenTipo;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cantidadActual: number;

  @Column({ name: 'iva_personalizado', type: 'decimal', precision: 5, scale: 2, nullable: true })
  ivaPersonalizado: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
