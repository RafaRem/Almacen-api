import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MovimientosAlmacenService } from './movimientos-almacen.service';
import { CreateMovimientoAlmacenDto } from './dto/create-movimiento-almacen.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('movimientos-almacen')
export class MovimientosAlmacenController {
  constructor(private readonly movimientosService: MovimientosAlmacenService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createMovimientoDto: CreateMovimientoAlmacenDto,
    @Request() req: any,
  ) {
    return this.movimientosService.create(createMovimientoDto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.movimientosService.findAll();
  }

  @Get('producto/:productoId')
  @UseGuards(JwtAuthGuard)
  findByProducto(@Param('productoId') productoId: string) {
    return this.movimientosService.findByProducto(productoId);
  }

  @Get('almacen/:tipo')
  @UseGuards(JwtAuthGuard)
  findByAlmacen(@Param('tipo') tipo: string) {
    return this.movimientosService.findByAlmacen(parseInt(tipo, 10));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.movimientosService.findOne(id);
  }
}