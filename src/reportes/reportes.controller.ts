import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('proximos-caducar')
  @UseGuards(JwtAuthGuard)
  getProductosProximosCaducar(@Query('meses') meses: string) {
    return this.reportesService.getProductosProximosCaducar(
      meses ? parseInt(meses, 10) : 6,
    );
  }

  @Get('alertas-vigencia')
  @UseGuards(JwtAuthGuard)
  getAlertasVigencia(@Query('dias') dias: string) {
    return this.reportesService.getAlertasVigencia(
      dias ? parseInt(dias, 10) : 30,
    );
  }

  @Get('stock-minimo')
  @UseGuards(JwtAuthGuard)
  getStockMinimo() {
    return this.reportesService.getStockMinimo();
  }

  @Get('caducados')
  @UseGuards(JwtAuthGuard)
  getProductosCaducados() {
    return this.reportesService.getProductosCaducados();
  }
}
