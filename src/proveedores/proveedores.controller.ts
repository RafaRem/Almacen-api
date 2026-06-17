import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Post()
  create(@Body() createProveedorDto: CreateProveedorDto) {
    return this.proveedoresService.create(createProveedorDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.proveedoresService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.proveedoresService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateProveedorDto: UpdateProveedorDto) {
    return this.proveedoresService.update(id, updateProveedorDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.proveedoresService.remove(id);
  }
}
