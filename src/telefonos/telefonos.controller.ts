import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { TelefonosService, CreateTelefonoDto } from './telefonos.service';
import { Telefono } from './entities/telefono.entity';

@Controller('telefonos')
export class TelefonosController {
  constructor(private readonly telefonosService: TelefonosService) {}

  @Get('cliente/:clienteId')
  async findByCliente(@Param('clienteId') clienteId: string): Promise<Telefono[]> {
    return this.telefonosService.findByCliente(clienteId);
  }

  @Post('cliente/:clienteId')
  async create(
    @Param('clienteId') clienteId: string,
    @Body() createTelefonoDto: CreateTelefonoDto,
  ): Promise<Telefono> {
    return this.telefonosService.create(clienteId, createTelefonoDto);
  }

  @Post('cliente/:clienteId/batch')
  async createMany(
    @Param('clienteId') clienteId: string,
    @Body() telefonos: CreateTelefonoDto[],
  ): Promise<Telefono[]> {
    return this.telefonosService.createMany(clienteId, telefonos);
  }

  @Delete('cliente/:clienteId')
  async deleteByCliente(@Param('clienteId') clienteId: string): Promise<void> {
    return this.telefonosService.deleteByCliente(clienteId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTelefonoDto: Partial<CreateTelefonoDto>,
  ): Promise<Telefono> {
    return this.telefonosService.update(id, updateTelefonoDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return this.telefonosService.delete(id);
  }
}