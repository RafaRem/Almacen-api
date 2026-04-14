import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InventarioAlmacenService } from './inventario-almacen.service';
import { AlmacenTipo } from '../common/enums/almacen-tipo.enum';
import { UpdateInventarioAlmacenDto } from './dto/update-inventario-almacen.dto';

@Controller('inventario-almacen')
export class InventarioAlmacenController {
  constructor(private readonly inventarioService: InventarioAlmacenService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.inventarioService.findAll();
  }

  @Get('almacen/:tipo')
  @UseGuards(JwtAuthGuard)
  findByAlmacen(@Param('tipo') tipo: string) {
    const tipoMap: Record<string, AlmacenTipo> = {
      'BODEGA': AlmacenTipo.RECEPCION,
      'RECEPCION': AlmacenTipo.RECEPCION,
      'VENTAS': AlmacenTipo.VENTAS,
      'MERMAS': AlmacenTipo.MERMAS,
      'CADUCADOS': AlmacenTipo.CADUCADOS,
      'DONADOS': AlmacenTipo.DONADOS,
      'DESTRUCCION': AlmacenTipo.DESTRUCCION,
    };
    const almacenTipo = tipoMap[tipo.toUpperCase()];
    if (almacenTipo === undefined) {
      throw new BadRequestException('Tipo de almacén inválido');
    }
    return this.inventarioService.findByAlmacen(almacenTipo);
  }

  @Get('stock/almacen/:tipo')
  @UseGuards(JwtAuthGuard)
  getStockPorAlmacen(@Param('tipo') tipo: string) {
    const tipoMap: Record<string, AlmacenTipo> = {
      'BODEGA': AlmacenTipo.RECEPCION,
      'RECEPCION': AlmacenTipo.RECEPCION,
      'VENTAS': AlmacenTipo.VENTAS,
      'MERMAS': AlmacenTipo.MERMAS,
      'CADUCADOS': AlmacenTipo.CADUCADOS,
      'DONADOS': AlmacenTipo.DONADOS,
      'DESTRUCCION': AlmacenTipo.DESTRUCCION,
    };
    const almacenTipo = tipoMap[tipo.toUpperCase()];
    if (almacenTipo === undefined) {
      throw new BadRequestException('Tipo de almacén inválido');
    }
    return this.inventarioService.getStockPorAlmacen(almacenTipo);
  }

  @Get('producto/:productoId')
  @UseGuards(JwtAuthGuard)
  findByProducto(@Param('productoId') productoId: string) {
    return this.inventarioService.findByProducto(productoId);
  }

  @Get('producto/:productoId/stock')
  @UseGuards(JwtAuthGuard)
  getStockProducto(
    @Param('productoId') productoId: string,
    @Query('almacen') almacen?: string,
  ) {
    const almacenTipo = almacen ? parseInt(almacen) as AlmacenTipo : undefined;
    return this.inventarioService.getStockTotal(productoId, almacenTipo);
  }

  @Post('mover')
  @UseGuards(JwtAuthGuard)
  moverStock(
    @Body()
    body: {
      productoId: string;
      loteId: string;
      cantidad: number;
      almacenOrigen: number;
      almacenDestino: number;
    },
  ) {
    return this.inventarioService.moverStock(
      body.productoId,
      body.loteId,
      body.cantidad,
      body.almacenOrigen as AlmacenTipo,
      body.almacenDestino as AlmacenTipo,
    );
  }

  @Post('mover-batch')
  @UseGuards(JwtAuthGuard)
  moverStockBatch(
    @Body()
    body: {
      items: {
        productoId: string;
        loteId: string;
        cantidad: number;
      }[];
      almacenOrigen: number;
      almacenDestino: number;
    },
  ) {
    console.log('[mover-batch] Endpoint recibido:', JSON.stringify(body, null, 2));
    return this.inventarioService.moverStockBatch(
      body.items,
      body.almacenOrigen as AlmacenTipo,
      body.almacenDestino as AlmacenTipo,
    );
  }

  @Get('debug/:productoId/:loteId/:almacenTipo')
  @UseGuards(JwtAuthGuard)
  debugInventario(
    @Param('productoId') productoId: string,
    @Param('loteId') loteId: string,
    @Param('almacenTipo') almacenTipo: string,
  ) {
    console.log('[debug] Buscando:', { productoId, loteId, almacenTipo });
    return this.inventarioService.debugFindByProductAndLote(productoId, loteId, parseInt(almacenTipo) as AlmacenTipo);
  }

  @Get('capas/:productoId')
  @UseGuards(JwtAuthGuard)
  getCapasPorProducto(@Param('productoId') productoId: string) {
    return this.inventarioService.getCapasPorProducto(productoId);
  }

  @Get('verify')
  @UseGuards(JwtAuthGuard)
  verifyInventory() {
    return this.inventarioService.verifyInventory();
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  syncInventory() {
    return this.inventarioService.syncInventory();
  }

  @Get('proximos-a-vencer')
  @UseGuards(JwtAuthGuard)
  getProximosAVencer(@Query('dias') dias?: string) {
    const diasNum = dias ? parseInt(dias, 10) : 60;
    return this.inventarioService.getProximosAVencer(diasNum);
  }

  @Post('agregar')
  @UseGuards(JwtAuthGuard)
  agregarStock(
    @Body()
    body: {
      productoId: string;
      loteId: string;
      almacenTipo: number;
      cantidad: number;
    },
  ) {
    return this.inventarioService.agregarStock(
      body.productoId,
      body.loteId,
      body.almacenTipo as AlmacenTipo,
      body.cantidad,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateInventarioAlmacenDto,
  ) {
    if (updateDto.ivaPersonalizado === undefined) {
      throw new BadRequestException('ivaPersonalizado es requerido');
    }
    return this.inventarioService.updateIvaPersonalizado(id, updateDto.ivaPersonalizado);
  }
}
