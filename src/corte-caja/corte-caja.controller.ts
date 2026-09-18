import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CorteCajaService } from './corte-caja.service';

@Controller('corte-caja')
@UseGuards(JwtAuthGuard)
export class CorteCajaController {
  constructor(private readonly corteCajaService: CorteCajaService) {}

  @Get('activo')
  async getCorteActivo(@Request() req: any) {
    const usuarioId = req.user?.userId || req.user?.id;
    const corte = await this.corteCajaService.getCorteActivo(usuarioId);
    if (!corte) {
      return { existe: false, corte: null };
    }
    return {
      existe: true,
      corte: {
        id: corte.id,
        usuarioId: corte.usuarioId,
        fechaApertura: corte.fechaApertura,
        status: corte.status,
      },
    };
  }

  @Post('aperturar')
  async aperturarCaja(@Request() req: any) {
    const usuarioId = req.user?.userId || req.user?.id;
    const corte = await this.corteCajaService.aperturarCaja(usuarioId);
    return {
      id: corte.id,
      usuarioId: corte.usuarioId,
      fechaApertura: corte.fechaApertura,
      status: corte.status,
    };
  }

  @Patch(':id/cerrar')
  async cerrarCaja(@Param('id') id: string, @Request() req: any) {
    const usuarioId = req.user?.userId || req.user?.id;
    const corte = await this.corteCajaService.cerrarCaja(id, usuarioId);
    return {
      id: corte.id,
      usuarioId: corte.usuarioId,
      fechaApertura: corte.fechaApertura,
      fechaCierre: corte.fechaCierre,
      status: corte.status,
    };
  }

  @Get(':id/ventas')
  async getVentasDelCorte(@Param('id') id: string) {
    return this.corteCajaService.getVentasDelCorte(id);
  }

  @Get(':id/resumen')
  async getResumenCorte(@Param('id') id: string) {
    return this.corteCajaService.getResumenCorte(id);
  }

  @Get('historial')
  async getHistorialCortes(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('usuarioId') filtroUsuarioId?: string,
  ) {
    const usuarioId = req.user?.userId || req.user?.id;
    const userTipo = req.user?.tipo;

    let filtroFinal = filtroUsuarioId;
    if (filtroUsuarioId && userTipo !== 'admin') {
      filtroFinal = undefined;
    }

    const cortes = await this.corteCajaService.getHistorialCortes(
      usuarioId,
      limit ? parseInt(limit, 10) : 50,
      filtroFinal,
    );
    return cortes.map((c) => ({
      id: c.id,
      usuarioId: c.usuarioId,
      fechaApertura: c.fechaApertura,
      fechaCierre: c.fechaCierre,
      status: c.status,
    }));
  }
}
