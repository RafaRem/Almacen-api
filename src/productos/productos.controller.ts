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
  Req,
} from '@nestjs/common';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { CreateProductoConStockDto } from './dto/create-producto-con-stock.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createProductoDto: CreateProductoDto) {
    return this.productosService.create(createProductoDto);
  }

  @Post('con-stock')
  @UseGuards(JwtAuthGuard)
  createConStock(@Body() dto: CreateProductoConStockDto, @Req() req) {
    return this.productosService.createConStock(dto, req.user?.id);
  }

  @Post('check-existence')
  @UseGuards(JwtAuthGuard)
  checkExistence(@Body() body: { codigosBarras: string[] }) {
    return this.productosService.checkExistence(body.codigosBarras);
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
  update(
    @Param('id') id: string,
    @Body() updateProductoDto: UpdateProductoDto,
  ) {
    return this.productosService.update(id, updateProductoDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.productosService.remove(id);
  }
}
