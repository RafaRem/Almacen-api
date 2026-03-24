import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoriaCliente } from './entities/categoria-cliente.entity';
import { CreateCategoriaClienteDto, UpdateCategoriaClienteDto } from './dto/create-categoria-cliente.dto';

@Injectable()
export class CategoriasClienteService {
  constructor(
    @InjectRepository(CategoriaCliente)
    private categoriasRepository: Repository<CategoriaCliente>,
  ) {}

  async create(createDto: CreateCategoriaClienteDto): Promise<CategoriaCliente> {
    const existing = await this.categoriasRepository.findOne({
      where: { nombre: createDto.nombre },
    });

    if (existing) {
      throw new ConflictException('Categoria with this nombre already exists');
    }

    const categoria = this.categoriasRepository.create(createDto);
    return this.categoriasRepository.save(categoria);
  }

  async findAll(): Promise<CategoriaCliente[]> {
    return this.categoriasRepository.find();
  }

  async findOne(id: string): Promise<CategoriaCliente> {
    const categoria = await this.categoriasRepository.findOne({ where: { id } });
    if (!categoria) {
      throw new NotFoundException(`CategoriaCliente with ID ${id} not found`);
    }
    return categoria;
  }

  async update(id: string, updateDto: UpdateCategoriaClienteDto): Promise<CategoriaCliente> {
    const categoria = await this.findOne(id);
    Object.assign(categoria, updateDto);
    return this.categoriasRepository.save(categoria);
  }

  async remove(id: string): Promise<void> {
    const categoria = await this.findOne(id);
    await this.categoriasRepository.remove(categoria);
  }
}