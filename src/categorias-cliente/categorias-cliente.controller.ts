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
import { CategoriasClienteService } from './categorias-cliente.service';
import { CreateCategoriaClienteDto, UpdateCategoriaClienteDto } from './dto/create-categoria-cliente.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('categorias-cliente')
export class CategoriasClienteController {
  constructor(private readonly categoriasService: CategoriasClienteService) {}

  @Post()
  create(@Body() createDto: CreateCategoriaClienteDto) {
    return this.categoriasService.create(createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.categoriasService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.categoriasService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateDto: UpdateCategoriaClienteDto) {
    return this.categoriasService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.categoriasService.remove(id);
  }
}