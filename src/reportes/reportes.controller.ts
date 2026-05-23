import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ReportesService, VentasPorClienteFilters, KardexInventarioFilters } from './reportes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('ventas-por-cliente')
  @UseGuards(JwtAuthGuard)
  getVentasPorCliente(
    @Query('clienteNombre') clienteNombre: string,
    @Query('fechaFrom') fechaFrom: string,
    @Query('fechaTo') fechaTo: string,
  ) {
    return this.reportesService.getVentasPorCliente({ clienteNombre, fechaFrom, fechaTo });
  }

  @Get('kardex-inventario')
  @UseGuards(JwtAuthGuard)
  getKardexInventario(
    @Query('productoNombre') productoNombre: string,
    @Query('folioVenta') folioVenta: string,
  ) {
    return this.reportesService.getKardexInventario({ productoNombre, folioVenta });
  }

  @Get('kardex-inventario/detalle/:productoId')
  @UseGuards(JwtAuthGuard)
  getKardexDetalleProducto(@Param('productoId') productoId: string) {
    return this.reportesService.getKardexDetalleProducto(productoId);
  }

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