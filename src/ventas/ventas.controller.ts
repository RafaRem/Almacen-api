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
import { PreviewDescuentoDto } from './dto/preview-descuento.dto';
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
    @Query('usuarioId') usuarioId?: string,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 20;
    return this.ventasService.findAll(skipNum, takeNum, {
      fechaFrom,
      fechaTo,
      clienteId,
      statusId,
      usuarioId,
    });
  }

  @Post('preview-descuento')
  @UseGuards(JwtAuthGuard)
  previewDescuento(@Body() dto: PreviewDescuentoDto) {
    return this.ventasService.previewDescuento(dto.productos, dto.clienteId);
  }

  @Get('folio/:folio')
  @UseGuards(JwtAuthGuard)
  findByFolio(@Param('folio') folio: string) {
    return this.ventasService.findByFolio(parseInt(folio, 10));
  }

  @Get('folio/:folio/user/:userId')
  @UseGuards(JwtAuthGuard)
  findByFolioAndUserId(
    @Param('folio') folio: string,
    @Param('userId') userId: string,
    @Query('fechaFrom') fechaFrom?: string,
    @Query('fechaTo') fechaTo?: string,
  ) {
    return this.ventasService.findByFolioAndUserId(
      parseInt(folio, 10),
      userId,
      fechaFrom,
      fechaTo,
    );
  }

  @Get('pendientes-factura')
  @UseGuards(JwtAuthGuard)
  pendientesFactura() {
    return this.ventasService.findPendientesFactura();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.ventasService.findOne(id);
  }

  @Patch(':id/cancelar')
  @UseGuards(JwtAuthGuard)
  cancel(@Param('id') id: string, @Request() req) {
    return this.ventasService.cancel(id, req.user?.id, 'Cancelación manual');
  }
}
