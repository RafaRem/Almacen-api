import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { RecepcionesService } from './recepciones.service';

@Controller('recepciones')
export class RecepcionesController {
  constructor(private readonly recepcionesService: RecepcionesService) {}

  @Get()
  findAll() {
    return this.recepcionesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const recepcion = await this.recepcionesService.findOne(id);
    if (!recepcion) throw new NotFoundException(`Recepcion ${id} not found`);
    return recepcion;
  }

  @Get(':id/lotes')
  async findLotes(@Param('id') id: string) {
    const recepcion = await this.recepcionesService.findByIdWithLotes(id);
    if (!recepcion) throw new NotFoundException(`Recepcion ${id} not found`);
    return recepcion;
  }
}
