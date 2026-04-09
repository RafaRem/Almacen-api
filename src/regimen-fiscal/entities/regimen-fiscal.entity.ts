import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type RegimenType = 'fisica' | 'moral' | 'ambos';

@Entity('regimen_fiscal')
export class RegimenFiscal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 3, unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 10 })
  type: RegimenType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}