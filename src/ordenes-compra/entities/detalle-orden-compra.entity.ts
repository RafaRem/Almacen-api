import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { OrdenCompra } from './orden-compra.entity';
import { Producto } from '../../productos/entities/producto.entity';

@Entity('detalle_orden_compra')
export class DetalleOrdenCompra {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ordenCompraId: string;

  @ManyToOne(() => OrdenCompra, (oc) => oc.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ordenCompraId' })
  ordenCompra: OrdenCompra;

  @Column()
  productoId: string;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'productoId' })
  producto: Producto;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  precioEstimado: number;

  @Column({ type: 'int', default: 0 })
  cantidadRecibida: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
