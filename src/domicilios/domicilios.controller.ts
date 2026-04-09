import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { DomiciliosService, CreateDomicilioDto } from './domicilios.service';
import { Domicilio } from './entities/domicilio.entity';

@Controller('domicilios')
export class DomiciliosController {
  constructor(private readonly domiciliosService: DomiciliosService) {}

  @Get('cliente/:clienteId')
  async findByCliente(@Param('clienteId') clienteId: string): Promise<Domicilio | null> {
    return this.domiciliosService.findByCliente(clienteId);
  }

  @Post('cliente/:clienteId')
  async create(
    @Param('clienteId') clienteId: string,
    @Body() createDomicilioDto: CreateDomicilioDto,
  ): Promise<Domicilio> {
    return this.domiciliosService.create(clienteId, createDomicilioDto);
  }

  @Patch('cliente/:clienteId')
  async update(
    @Param('clienteId') clienteId: string,
    @Body() updateDomicilioDto: Partial<CreateDomicilioDto>,
  ): Promise<Domicilio> {
    return this.domiciliosService.update(clienteId, updateDomicilioDto);
  }

  @Delete('cliente/:clienteId')
  async delete(@Param('clienteId') clienteId: string): Promise<void> {
    return this.domiciliosService.delete(clienteId);
  }
}