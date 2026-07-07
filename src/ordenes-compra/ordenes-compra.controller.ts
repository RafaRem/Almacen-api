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
import { OrdenesCompraService } from './ordenes-compra.service';
import {
  CreateOrdenCompraDto,
  RecibirOrdenCompraDto,
} from './dto/create-orden-compra.dto';
import { UpdateOrdenCompraDto } from './dto/update-orden-compra.dto';
import { ReabastecerDto } from './dto/reabastecer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ordenes-compra')
export class OrdenesCompraController {
  constructor(private readonly ordenesCompraService: OrdenesCompraService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createDto: CreateOrdenCompraDto) {
    return this.ordenesCompraService.create(createDto);
  }

  @Post('reabastecer')
  @UseGuards(JwtAuthGuard)
  reabastecer(@Body() dto: ReabastecerDto) {
    return this.ordenesCompraService.reabastecer(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('status') status?: string,
    @Query('proveedorId') proveedorId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordenesCompraService.findAll({ status, proveedorId, page, limit });
  }

  @Get('borradores')
  @UseGuards(JwtAuthGuard)
  findBorradores() {
    return this.ordenesCompraService.findBorradores();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.ordenesCompraService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateDto: UpdateOrdenCompraDto) {
    return this.ordenesCompraService.update(id, updateDto);
  }

  @Post(':id/detalles')
  @UseGuards(JwtAuthGuard)
  addDetalle(
    @Param('id') id: string,
    @Body()
    detalleData: {
      productoId: string;
      cantidad: number;
    },
  ) {
    return this.ordenesCompraService.addDetalle(id, detalleData);
  }

  @Delete(':id/detalles/:detalleId')
  @UseGuards(JwtAuthGuard)
  removeDetalle(
    @Param('id') id: string,
    @Param('detalleId') detalleId: string,
  ) {
    return this.ordenesCompraService.removeDetalle(id, detalleId);
  }

  @Post(':id/recibir')
  @UseGuards(JwtAuthGuard)
  recibir(@Param('id') id: string, @Body() recibirDto: RecibirOrdenCompraDto) {
    return this.ordenesCompraService.recibir(id, recibirDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  cambiarStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.ordenesCompraService.cambiarStatus(id, body.status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.ordenesCompraService.remove(id);
  }
}
