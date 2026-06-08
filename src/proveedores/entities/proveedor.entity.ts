import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { StatusId } from '../../common/enums/status-id.enum';

@Entity('proveedores')
export class Proveedor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  contacto: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ nullable: true })
  rfc: string;

  @Column({ nullable: true })
  calle: string;

  @Column({ nullable: true })
  numeroExterior: string;

  @Column({ nullable: true })
  numeroInterior: string;

  @Column({ nullable: true })
  codigoPostal: string;

  @Column({ nullable: true })
  colonia: string;

  @Column({ nullable: true })
  municipio: string;

  @Column({ nullable: true })
  estado: string;

  @Column({ type: 'enum', enum: StatusId, default: StatusId.ACTIVE })
  statusId: StatusId;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
