import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { ChangeLoteDto } from './dto/change-lote.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createProductoDto: CreateProductoDto) {
    return this.productosService.create(createProductoDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.productosService.findAll();
  }

  @Get('buscar')
  @UseGuards(JwtAuthGuard)
  findByNombre(@Query('q') nombre: string) {
    return this.productosService.findByNombre(nombre);
  }

  @Get('codigo/:codigo')
  @UseGuards(JwtAuthGuard)
  findByCodigoBarras(@Param('codigo') codigo: string) {
    return this.productosService.findByCodigoBarras(codigo);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.productosService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateProductoDto: UpdateProductoDto) {
    return this.productosService.update(id, updateProductoDto);
  }

  @Patch(':id/lote')
  @UseGuards(JwtAuthGuard)
  changeLote(@Param('id') id: string, @Body() changeLoteDto: ChangeLoteDto) {
    return this.productosService.changeLote(id, changeLoteDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.productosService.remove(id);
  }
}