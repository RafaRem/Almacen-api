import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('datos_empresa')
export class DatosEmpresa {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  nombre: string;

  @Column({ length: 13, nullable: true })
  rfc: string;

  @Column({ type: 'text', nullable: true })
  direccion: string;

  @Column({ length: 20, nullable: true })
  telefono: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column({ name: 'regimen_fiscal', length: 100, nullable: true })
  regimenFiscal: string;

  @Column({ length: 5, nullable: true })
  cp: string;

  @Column({ length: 100, nullable: true })
  ciudad: string;

  @Column({ length: 100, nullable: true })
  estado: string;

  @Column({ default: true })
  activo: boolean;

  @UpdateDateColumn({ name: 'updatedat' })
  updatedAt: Date;
}
