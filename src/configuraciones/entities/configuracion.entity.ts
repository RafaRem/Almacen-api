import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('configuraciones')
export class Configuracion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  clave: string;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  valor: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
