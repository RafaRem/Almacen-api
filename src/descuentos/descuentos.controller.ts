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
import { DescuentosService } from './descuentos.service';
import {
  CreateDescuentoDto,
  UpdateDescuentoDto,
} from './dto/create-descuento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('descuentos')
export class DescuentosController {
  constructor(private readonly descuentosService: DescuentosService) {}

  @Post()
  create(@Body() createDto: CreateDescuentoDto) {
    return this.descuentosService.create(createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.descuentosService.findAll();
  }

  @Get('laboratorio/:id')
  @UseGuards(JwtAuthGuard)
  findByLaboratorio(@Param('id') id: string) {
    return this.descuentosService.findByLaboratorio(id);
  }

  @Get('calculadora')
  @UseGuards(JwtAuthGuard)
  calcular(
    @Query('productoId') productoId: string,
    @Query('cantidad') cantidad: number,
    @Query('clienteId') clienteId?: string,
  ) {
    return this.descuentosService.calcularMejorDescuento(
      productoId,
      Number(cantidad),
      '',
      clienteId,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.descuentosService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateDto: UpdateDescuentoDto) {
    return this.descuentosService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.descuentosService.remove(id);
  }
}
