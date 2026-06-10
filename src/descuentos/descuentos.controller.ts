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
  PreviewProductDiscountDto,
} from './dto/create-descuento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { UserModule } from '../common/enums/user-module.enum';
import { ClientesService } from '../clientes/clientes.service';

@Controller('descuentos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DescuentosController {
  constructor(
    private readonly descuentosService: DescuentosService,
    private readonly clientesService: ClientesService,
  ) {}

  @Post()
  @RequirePermission(UserModule.DISCOUNTS)
  create(@Body() createDto: CreateDescuentoDto) {
    return this.descuentosService.create(createDto);
  }

  @Get()
  @RequirePermission(UserModule.DISCOUNTS)
  findAll() {
    return this.descuentosService.findAll();
  }

  @Get('laboratorio/:id')
  @RequirePermission(UserModule.DISCOUNTS)
  findByLaboratorio(@Param('id') id: string) {
    return this.descuentosService.findByLaboratorio(id);
  }

  @Get('calculadora')
  async calcular(
    @Query('productoId') productoId: string,
    @Query('cantidad') cantidad: number,
    @Query('clienteId') clienteId?: string,
  ) {
    let categoriaClienteId: string | undefined;
    if (clienteId) {
      try {
        const cliente = await this.clientesService.findOne(clienteId);
        categoriaClienteId = cliente?.categoriaClienteId;
      } catch {}
    }
    return this.descuentosService.calcularMejorDescuento(
      productoId,
      Number(cantidad),
      '',
      categoriaClienteId,
    );
  }

  @Post('preview-product')
  async previewProductDiscount(
    @Body() dto: PreviewProductDiscountDto,
  ) {
    let categoriaClienteId: string | undefined;
    if (dto.clienteId) {
      try {
        const cliente = await this.clientesService.findOne(dto.clienteId);
        categoriaClienteId = cliente?.categoriaClienteId;
      } catch {}
    }
    return this.descuentosService.previewProductDiscount(
      dto.productoId,
      dto.cantidad,
      dto.precioUnitario,
      dto.iva,
      dto.margen,
      dto.laboratorioId,
      categoriaClienteId,
    );
  }

  @Get(':id')
  @RequirePermission(UserModule.DISCOUNTS)
  findOne(@Param('id') id: string) {
    return this.descuentosService.findOne(id);
  }

  @Get(':id/productos')
  @RequirePermission(UserModule.DISCOUNTS)
  findProductos(@Param('id') id: string) {
    return this.descuentosService.findProductoIds(id);
  }

  @Patch(':id')
  @RequirePermission(UserModule.DISCOUNTS)
  update(@Param('id') id: string, @Body() updateDto: UpdateDescuentoDto) {
    return this.descuentosService.update(id, updateDto);
  }

  @Delete(':id')
  @RequirePermission(UserModule.DISCOUNTS)
  remove(@Param('id') id: string) {
    return this.descuentosService.remove(id);
  }
}
