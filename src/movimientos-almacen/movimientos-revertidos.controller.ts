import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MovimientosRevertidosService } from './movimientos-revertidos.service';
import { TipoReversion } from './entities/movimiento-revertido.entity';

@Controller('movimientos-revertidos')
@UseGuards(JwtAuthGuard)
export class MovimientosRevertidosController {
  constructor(
    private readonly revertidosService: MovimientosRevertidosService,
  ) {}

  @Get('historial-fa')
  async obtenerHistorialFA(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('productoId') productoId?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.revertidosService.obtenerHistorialFA({
      page,
      limit: Math.min(limit, 100),
      productoId,
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
    });
  }

  @Get('historial-fa/producto/:productoId')
  async getFailedActionsPorProducto(@Param('productoId') productoId: string) {
    return this.revertidosService.getFailedActionsPorProducto(productoId);
  }

  @Get('historial-reversiones')
  async obtenerHistorialReversiones(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('productoId') productoId?: string,
    @Query('userIdRevirtio') userIdRevirtio?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.revertidosService.obtenerHistorialReversiones({
      page,
      limit: Math.min(limit, 100),
      productoId,
      userIdRevirtio,
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
    });
  }

  @Get('preview-reversion/:movimientoId')
  async previewReversión(@Param('movimientoId') movimientoId: string) {
    return this.revertidosService.previewReversion(movimientoId);
  }

  @Post('revertir/:movimientoId')
  async revertirMovimiento(
    @Param('movimientoId') movimientoId: string,
    @Body() body: { motivo: string; revertirSubsecuentes?: boolean },
    @Req() req: any,
  ) {
    const adminUserId = req.user?.id || req.user?.sub;
    if (!adminUserId) {
      throw new Error('Usuario no autenticado');
    }
    return this.revertidosService.revertirMovimiento(
      movimientoId,
      adminUserId,
      body.motivo,
      body.revertirSubsecuentes || false,
    );
  }

  @Get('config-reversion')
  async getConfig() {
    return this.revertidosService.getConfig();
  }

  @Post('config-reversion')
  async updateConfig(@Body() config: any, @Req() req: any) {
    const adminUserId = req.user?.id || req.user?.sub || 'SYSTEM';
    return this.revertidosService.updateConfig(config, adminUserId);
  }

  @Post('inicializar-config')
  async inicializarConfiguraciones() {
    await this.revertidosService.inicializarConfiguraciones();
    return { message: 'Configuraciones inicializadas' };
  }
}
