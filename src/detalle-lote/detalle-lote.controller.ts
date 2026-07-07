import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { DetalleLoteService } from './detalle-lote.service';
import { CreateDetalleLoteDto } from './dto/create-detalle-lote.dto';
import { UpdateDetalleLoteDto } from './dto/update-detalle-lote.dto';
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
  create(@Body() dto: CreateDetalleLoteDto) {
    return this.detalleLoteService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDetalleLoteDto) {
    return this.detalleLoteService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.detalleLoteService.remove(id);
  }
}
