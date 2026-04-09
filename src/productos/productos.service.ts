import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Producto } from './entities/producto.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { ChangeLoteDto } from './dto/change-lote.dto';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private productosRepository: Repository<Producto>,
  ) {}

  async create(createProductoDto: CreateProductoDto): Promise<Producto> {
    const existingProducto = await this.productosRepository.findOne({
      where: { codigoBarras: createProductoDto.codigoBarras },
    });

    if (existingProducto) {
      throw new ConflictException('Producto with this codigoBarras already exists');
    }

    const producto = this.productosRepository.create(createProductoDto);
    return this.productosRepository.save(producto);
  }

  async findAll(): Promise<Producto[]> {
    return this.productosRepository.find({
      relations: ['laboratorio', 'lote'],
    });
  }

  async findOne(id: string): Promise<Producto> {
    const producto = await this.productosRepository.findOne({
      where: { id },
      relations: ['laboratorio', 'lote'],
    });
    if (!producto) {
      throw new NotFoundException(`Producto with ID ${id} not found`);
    }
    return producto;
  }

  async findByCodigoBarras(codigo: string): Promise<Producto> {
    const producto = await this.productosRepository.findOne({
      where: { codigoBarras: codigo },
      relations: ['laboratorio', 'lote'],
    });
    if (!producto) {
      throw new NotFoundException(`Producto with codigoBarras ${codigo} not found`);
    }
    return producto;
  }

  async findByNombre(nombre: string): Promise<Producto[]> {
    return this.productosRepository.find({
      where: { nombre: Like(`%${nombre}%`) },
      relations: ['laboratorio', 'lote'],
    });
  }

  async update(id: string, updateProductoDto: UpdateProductoDto): Promise<Producto> {
    const producto = await this.findOne(id);

    if (updateProductoDto.codigoBarras && updateProductoDto.codigoBarras !== producto.codigoBarras) {
      const existingProducto = await this.productosRepository.findOne({
        where: { codigoBarras: updateProductoDto.codigoBarras },
      });
      if (existingProducto) {
        throw new ConflictException('Producto with this codigoBarras already exists');
      }
    }

    Object.assign(producto, updateProductoDto);
    return this.productosRepository.save(producto);
  }

  async changeLote(id: string, changeLoteDto: ChangeLoteDto): Promise<Producto> {
    const producto = await this.findOne(id);
    producto.loteId = changeLoteDto.loteId;
    return this.productosRepository.save(producto);
  }

  async remove(id: string): Promise<void> {
    const producto = await this.findOne(id);
    await this.productosRepository.remove(producto);
  }

  async updateStock(id: string, newStock: number): Promise<Producto> {
    const producto = await this.findOne(id);
    producto.stock = newStock;
    return this.productosRepository.save(producto);
  }
}