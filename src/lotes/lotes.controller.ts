import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { LotesService } from './lotes.service';
import { CreateLoteDto } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('lotes')
export class LotesController {
  constructor(private readonly lotesService: LotesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createLoteDto: CreateLoteDto) {
    return this.lotesService.create(createLoteDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.lotesService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.lotesService.findOne(id);
  }

  @Get('producto/:productoId')
  @UseGuards(JwtAuthGuard)
  findByProducto(@Param('productoId') productoId: string) {
    return this.lotesService.findByProducto(productoId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateLoteDto: UpdateLoteDto) {
    return this.lotesService.update(id, updateLoteDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.lotesService.remove(id);
  }
}
