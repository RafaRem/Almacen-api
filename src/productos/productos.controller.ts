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
  Req,
} from '@nestjs/common';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { CreateProductoConStockDto } from './dto/create-producto-con-stock.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import {
  EmpaqueConvertirDto,
  EmpaqueFactorDto,
  EmpaquePreviewDto,
} from './dto/empaque.dto';
import { UpdatePresentacionAliasDto } from './dto/update-presentacion-alias.dto';
import { PresentacionesService } from './presentaciones.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('productos')
export class ProductosController {
  constructor(
    private readonly productosService: ProductosService,
    private readonly presentacionesService: PresentacionesService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createProductoDto: CreateProductoDto) {
    return this.productosService.create(createProductoDto);
  }

  @Post('con-stock')
  @UseGuards(JwtAuthGuard)
  createConStock(@Body() dto: CreateProductoConStockDto, @Req() req) {
    return this.productosService.createConStock(dto, req.user?.id);
  }

  @Post('check-existence')
  @UseGuards(JwtAuthGuard)
  checkExistence(@Body() body: { codigosBarras: string[] }) {
    return this.productosService.checkExistence(body.codigosBarras);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.productosService.findAll();
  }

  @Get('empaques/pendientes')
  @UseGuards(JwtAuthGuard)
  findEmpaquesPendientes(
    @Query('search') search?: string,
    @Query('estado') estado?: string,
  ) {
    return this.presentacionesService.findPendientes(search, estado);
  }

  @Patch(':id/empaque/factor')
  @UseGuards(JwtAuthGuard)
  saveEmpaqueFactor(
    @Param('id') id: string,
    @Body() dto: EmpaqueFactorDto,
  ) {
    return this.presentacionesService.saveFactor(id, dto.piezasPorCaja);
  }

  @Patch(':id/empaque/lotes/:loteId/factor')
  @UseGuards(JwtAuthGuard)
  saveLoteFactor(
    @Param('id') id: string,
    @Param('loteId') loteId: string,
    @Body() dto: EmpaqueFactorDto,
  ) {
    return this.presentacionesService.updateLoteFactor(
      id,
      loteId,
      dto.piezasPorCaja,
      dto.precioVentaCaja,
      dto.precioVentaPieza,
    );
  }

  @Post(':id/empaque/preview')
  @UseGuards(JwtAuthGuard)
  previewEmpaque(
    @Param('id') id: string,
    @Body() dto: EmpaquePreviewDto,
  ) {
    return this.presentacionesService.preview(id, dto);
  }

  @Post(':id/empaque/convertir')
  @UseGuards(JwtAuthGuard)
  convertirEmpaque(
    @Param('id') id: string,
    @Body() dto: EmpaqueConvertirDto,
    @Req() req: any,
  ) {
    return this.presentacionesService.convertir(
      id,
      dto,
      req.user?.id || req.user?.sub || 'SYSTEM',
    );
  }

  @Get('buscar')
  @UseGuards(JwtAuthGuard)
  findByNombre(@Query('q') nombre: string) {
    return this.productosService.findByNombre(nombre);
  }

  @Get('presentacion-codigo/:codigo')
  @UseGuards(JwtAuthGuard)
  findByPresentacionCodigo(@Param('codigo') codigo: string) {
    return this.presentacionesService.findByCodigoBarras(codigo);
  }

  @Get('codigo/:codigo')
  @UseGuards(JwtAuthGuard)
  findByCodigoBarras(@Param('codigo') codigo: string) {
    return this.productosService.findByCodigoBarras(codigo);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.productosService.findOne(id);
  }

  @Patch(':id/presentaciones/alias')
  @UseGuards(JwtAuthGuard)
  updatePresentationAliases(
    @Param('id') id: string,
    @Body() dto: UpdatePresentacionAliasDto,
  ) {
    return this.presentacionesService.updateAliases(id, dto.presentaciones);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateProductoDto: UpdateProductoDto,
  ) {
    return this.productosService.update(id, updateProductoDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.productosService.remove(id);
  }
}
