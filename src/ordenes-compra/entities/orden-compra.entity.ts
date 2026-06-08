import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Proveedor } from '../../proveedores/entities/proveedor.entity';
import { DetalleOrdenCompra } from './detalle-orden-compra.entity';

@Entity('ordenes_compra')
export class OrdenCompra {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  folio: string;

  @Column()
  proveedorId: string;

  @ManyToOne(() => Proveedor)
  @JoinColumn({ name: 'proveedorId' })
  proveedor: Proveedor;

  @Column({ default: 'BORRADOR' })
  status: string;

  @Column({ type: 'date', nullable: true })
  fechaOrden: string;

  @Column({ type: 'date', nullable: true })
  fechaEsperada: string;

  @Column({ nullable: true })
  observaciones: string;

  @OneToMany(() => DetalleOrdenCompra, (detalle) => detalle.ordenCompra, { cascade: true })
  detalles: DetalleOrdenCompra[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
