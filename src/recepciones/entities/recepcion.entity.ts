import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn } from 'typeorm';
import { Proveedor } from '../../proveedores/entities/proveedor.entity';
import { Lote } from '../../lotes/entities/lote.entity';

@Entity('recepciones')
export class Recepcion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  serie: string;

  @Column({ nullable: true })
  folio: string;

  @Column({ nullable: true })
  uuidCfdi: string;

  @Column({ type: 'timestamp', nullable: true })
  fecha: Date;

  @Column()
  emisorRfc: string;

  @Column()
  emisorNombre: string;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  subtotal: number;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  total: number;

  @Column({ nullable: true })
  proveedorId: string;

  @ManyToOne(() => Proveedor, { nullable: true })
  @JoinColumn({ name: 'proveedorId' })
  proveedor: Proveedor;

  @Column({ type: 'text', nullable: true })
  xmlContent: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Lote, lote => lote.recepcion)
  lotes: Lote[];
}
