import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CuentasCobrarService,
  CreateCuentaPorCobrarDto,
  UpdateCuentaPorCobrarDto,
} from './cuentas-cobrar.service';
import { CuentaPorCobrar } from './entities/cuenta-cobrar.entity';
import { Abono } from '../abonos/entities/abono.entity';

@UseGuards(JwtAuthGuard)
@Controller('cuentas-cobrar')
export class CuentasCobrarController {
  constructor(private readonly cuentasCobrarService: CuentasCobrarService) {}

  @Get()
  async findAll(
    @Query('clienteId') clienteId?: string,
    @Query('status') status?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ): Promise<any[]> {
    const filtros: any = {};
    if (clienteId) filtros.clienteId = clienteId;
    if (status) filtros.status = parseInt(status, 10);
    if (fechaDesde) filtros.fechaDesde = fechaDesde;
    if (fechaHasta) filtros.fechaHasta = fechaHasta;
    return this.cuentasCobrarService.findAll(filtros);
  }

  @Get('resumen')
  async getResumen(): Promise<any> {
    return this.cuentasCobrarService.getResumen();
  }

  @Get('cliente/:clienteId')
  async findByCliente(
    @Param('clienteId') clienteId: string,
  ): Promise<CuentaPorCobrar[]> {
    return this.cuentasCobrarService.findByCliente(clienteId);
  }

  @Get('venta/:ventaId')
  async findByVenta(
    @Param('ventaId') ventaId: string,
  ): Promise<CuentaPorCobrar | null> {
    return this.cuentasCobrarService.findByVenta(ventaId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<CuentaPorCobrar> {
    return this.cuentasCobrarService.findOne(id);
  }

  @Post()
  async create(
    @Body() createDto: CreateCuentaPorCobrarDto,
  ): Promise<CuentaPorCobrar> {
    return this.cuentasCobrarService.create(createDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCuentaPorCobrarDto,
  ): Promise<CuentaPorCobrar> {
    return this.cuentasCobrarService.update(id, updateDto);
  }

  @Post(':id/pagar')
  async marcarPagada(@Param('id') id: string): Promise<CuentaPorCobrar> {
    return this.cuentasCobrarService.marcarPagada(id);
  }

  @Post(':id/abono')
  async aplicarAbono(
    @Param('id') id: string,
    @Body() body: { monto: number; observaciones?: string },
    @Request() req,
  ): Promise<{ cuenta: CuentaPorCobrar; abono: Abono }> {
    return this.cuentasCobrarService.aplicarAbono(
      id,
      body.monto,
      req.user?.id,
      body.observaciones,
    );
  }

  @Get(':id/abonos')
  async abonosPorCuenta(@Param('id') id: string): Promise<Abono[]> {
    return this.cuentasCobrarService.abonosPorCuenta(id);
  }
}
