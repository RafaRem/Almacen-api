import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createVentaDto: CreateVentaDto, @Request() req: any) {
    return this.ventasService.create(createVentaDto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('fechaFrom') fechaFrom?: string,
    @Query('fechaTo') fechaTo?: string,
    @Query('clienteId') clienteId?: string,
    @Query('statusId') statusId?: string,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 20;
    return this.ventasService.findAll(skipNum, takeNum, { fechaFrom, fechaTo, clienteId, statusId });
  }

  @Get('preview-descuento')
  @UseGuards(JwtAuthGuard)
  previewDescuento(
    @Query('productos') productosJson: string,
    @Query('clienteId') clienteId?: string,
  ) {
    const productos = JSON.parse(productosJson);
    return this.ventasService.previewDescuento(productos, clienteId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.ventasService.findOne(id);
  }

  @Patch(':id/cancelar')
  @UseGuards(JwtAuthGuard)
  cancel(@Param('id') id: string) {
    return this.ventasService.cancel(id);
  }
}
