import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proveedor } from './entities/proveedor.entity';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectRepository(Proveedor)
    private proveedoresRepository: Repository<Proveedor>,
  ) {}

  async create(createProveedorDto: CreateProveedorDto): Promise<Proveedor> {
    const existing = await this.proveedoresRepository.findOne({
      where: { rfc: createProveedorDto.rfc },
    });
    if (existing && createProveedorDto.rfc) {
      throw new ConflictException('RFC already exists');
    }
    const proveedor = this.proveedoresRepository.create(createProveedorDto);
    return this.proveedoresRepository.save(proveedor);
  }

  async findAll(): Promise<Proveedor[]> {
    return this.proveedoresRepository.find({
      where: { statusId: 1 } as any,
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Proveedor> {
    const proveedor = await this.proveedoresRepository.findOne({ where: { id } });
    if (!proveedor) {
      throw new NotFoundException(`Proveedor with ID ${id} not found`);
    }
    return proveedor;
  }

  async findByRfc(rfc: string): Promise<Proveedor | null> {
    return this.proveedoresRepository.findOne({ where: { rfc } });
  }

  async update(id: string, updateProveedorDto: UpdateProveedorDto): Promise<Proveedor> {
    const proveedor = await this.findOne(id);

    if (updateProveedorDto.rfc && updateProveedorDto.rfc !== proveedor.rfc) {
      const existing = await this.proveedoresRepository.findOne({
        where: { rfc: updateProveedorDto.rfc },
      });
      if (existing) {
        throw new ConflictException('RFC already exists');
      }
    }

    Object.assign(proveedor, updateProveedorDto);
    return this.proveedoresRepository.save(proveedor);
  }

  async remove(id: string): Promise<void> {
    const proveedor = await this.findOne(id);
    proveedor.statusId = 0 as any;
    await this.proveedoresRepository.save(proveedor);
  }
}
