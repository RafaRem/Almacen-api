import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Venta } from './venta.entity';
import { Producto } from '../../productos/entities/producto.entity';
import { Lote } from '../../lotes/entities/lote.entity';
import { ProductoPresentacion } from '../../productos/entities/producto-presentacion.entity';
import { DescuentoVentaDetalle } from '../../descuentos/entities/descuento-venta-detalle.entity';
import { DetalleVentaLote } from './detalle-venta-lote.entity';

@Entity('detalle_venta')
export class DetalleVenta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'ventaid' })
  ventaId: string;

  @ManyToOne(() => Venta, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ventaid' })
  venta: Venta;

  @Column({ type: 'uuid', name: 'productoid' })
  productoId: string;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'productoid' })
  producto: Producto;

  @Column({ type: 'uuid', name: 'loteid' })
  loteId: string;

  @ManyToOne(() => Lote)
  @JoinColumn({ name: 'loteid' })
  lote: Lote;

  @Column({ type: 'uuid', name: 'presentacionid', nullable: true })
  presentacionId: string | null;

  @ManyToOne(() => ProductoPresentacion, { nullable: true })
  @JoinColumn({ name: 'presentacionid' })
  presentacion: ProductoPresentacion | null;

  @Column({ type: 'int', name: 'factor_unidades', nullable: true })
  factorUnidades: number | null;

  @Column({ type: 'int', name: 'cantidad_base', nullable: true })
  cantidadBase: number | null;

  @Column({ type: 'varchar', length: 80, name: 'presentacion_alias', nullable: true })
  presentacionAlias: string | null;

  @Column({ type: 'varchar', length: 20, name: 'tipo_presentacion', nullable: true })
  tipoPresentacion: string | null;

  @Column({ type: 'varchar', length: 20, name: 'clave_unidad', nullable: true })
  claveUnidad: string | null;

  @Column({ type: 'varchar', length: 20, name: 'unidad', nullable: true })
  unidad: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'iva_tasa', nullable: true })
  ivaTasa: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'iva_importe', nullable: true })
  ivaImporte: number | null;

  @Column({ type: 'int', name: 'cantidad' })
  cantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'preciounitario' })
  precioUnitario: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'descuentolinea',
    default: 0,
  })
  descuentoLinea: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'subtotal' })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'importebruto' })
  importeBruto: number;

  @Column({ type: 'decimal', precision: 12, scale: 6, name: 'costounitario', nullable: true })
  costoUnitario: number | null;

  @OneToMany(
    () => DescuentoVentaDetalle,
    (descuentoDetalle) => descuentoDetalle.detalleVenta,
  )
  descuentos: DescuentoVentaDetalle[];

  @OneToMany(
    () => DetalleVentaLote,
    (detalleLote) => detalleLote.detalleVenta,
    { cascade: true },
  )
  lotesUtilizados: DetalleVentaLote[];
}
