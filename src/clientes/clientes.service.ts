import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente } from './entities/cliente.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/create-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private clientesRepository: Repository<Cliente>,
  ) {}

  async create(createClienteDto: CreateClienteDto): Promise<Cliente> {
    const existing = await this.clientesRepository.findOne({
      where: [{ email: createClienteDto.email }],
    });

    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    if (createClienteDto.rfc === '') {
      createClienteDto.rfc = undefined;
    }

    if (createClienteDto.rfc) {
      const existingRfc = await this.clientesRepository.findOne({
        where: { rfc: createClienteDto.rfc },
      });
      if (existingRfc) {
        throw new ConflictException('El RFC ya está registrado');
      }
    }

    const cliente = this.clientesRepository.create(createClienteDto);
    return this.clientesRepository.save(cliente);
  }

  async findAll(statusId?: string): Promise<Cliente[]> {
    const where: any = {};
    if (statusId) {
      where.statusId = parseInt(statusId, 10);
    }
    return this.clientesRepository.find({
      where,
      relations: [
        'categoriaCliente',
        'telefonos',
        'domicilio',
        'facturacionCliente',
        'facturacionCliente.regimenFiscal',
        'credito',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Cliente> {
    const cliente = await this.clientesRepository.findOne({
      where: { id },
      relations: [
        'categoriaCliente',
        'telefonos',
        'domicilio',
        'facturacionCliente',
        'facturacionCliente.regimenFiscal',
        'credito',
      ],
    });
    if (!cliente) {
      throw new NotFoundException(`Cliente with ID ${id} not found`);
    }
    return cliente;
  }

  async update(
    id: string,
    updateClienteDto: UpdateClienteDto,
  ): Promise<Cliente> {
    const cliente = await this.findOne(id);

    if (updateClienteDto.email && updateClienteDto.email !== cliente.email) {
      const existing = await this.clientesRepository.findOne({
        where: { email: updateClienteDto.email },
      });
      if (existing) {
        throw new ConflictException('El email ya está registrado');
      }
    }

    if (updateClienteDto.rfc === '') {
      updateClienteDto.rfc = undefined;
    }

    if (updateClienteDto.rfc && updateClienteDto.rfc !== cliente.rfc) {
      const existingRfc = await this.clientesRepository.findOne({
        where: { rfc: updateClienteDto.rfc },
      });
      if (existingRfc) {
        throw new ConflictException('El RFC ya está registrado');
      }
    }

    Object.assign(cliente, updateClienteDto);
    if (updateClienteDto.categoriaClienteId !== undefined) {
      cliente.categoriaCliente = null as any;
    }
    await this.clientesRepository.save(cliente);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const cliente = await this.findOne(id);
    cliente.statusId = 2;
    await this.clientesRepository.save(cliente);
  }
}
