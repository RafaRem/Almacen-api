import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StatusId } from '../../common/enums/status-id.enum';
import { TipoDocumento } from '../../common/enums/tipo-documento.enum';
import { Cliente } from '../../clientes/entities/cliente.entity';

@Entity('documentos_cliente')
export class DocumentoCliente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clienteId: string;

  @ManyToOne(() => Cliente)
  @JoinColumn({ name: 'clienteId' })
  cliente: Cliente;

  @Column({
    type: 'enum',
    enum: TipoDocumento,
  })
  tipoDocumento: TipoDocumento;

  @Column()
  nombreArchivo: string;

  @Column()
  rutaArchivo: string;

  @Column()
  mimeType: string;

  @Column()
  tamano: number;

  @CreateDateColumn()
  fechaSubida: Date;

  @Column({ type: 'date', nullable: true })
  vigencia: Date;

  @Column({
    type: 'enum',
    enum: StatusId,
    default: StatusId.ACTIVE,
  })
  statusId: StatusId;
}
