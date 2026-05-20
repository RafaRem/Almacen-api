import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { DetalleLoteService } from './detalle-lote.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('detalle-lote')
@UseGuards(JwtAuthGuard)
export class DetalleLoteController {
  constructor(private readonly detalleLoteService: DetalleLoteService) {}

  @Get()
  findAll() {
    return this.detalleLoteService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.detalleLoteService.findOne(id);
  }

  @Get('producto/:productoId')
  findByProducto(@Param('productoId') productoId: string) {
    return this.detalleLoteService.findByProducto(productoId);
  }

  @Get('lote/:loteId')
  findByLote(@Param('loteId') loteId: string) {
    return this.detalleLoteService.findByLote(loteId);
  }

  @Post()
  create(@Body() data: any) {
    return this.detalleLoteService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.detalleLoteService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.detalleLoteService.remove(id);
  }
}