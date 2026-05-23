import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import {
  FacturacionClienteService,
  CreateFacturacionClienteDto,
} from './facturacion-cliente.service';
import { FacturacionCliente } from './entities/facturacion-cliente.entity';

@Controller('facturacion-cliente')
export class FacturacionClienteController {
  constructor(private readonly facturacionService: FacturacionClienteService) {}

  @Get('cliente/:clienteId')
  async findByCliente(
    @Param('clienteId') clienteId: string,
  ): Promise<FacturacionCliente | null> {
    return this.facturacionService.findByCliente(clienteId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<FacturacionCliente | null> {
    return this.facturacionService.findOne(id);
  }

  @Post('cliente/:clienteId')
  async create(
    @Param('clienteId') clienteId: string,
    @Body() createDto: CreateFacturacionClienteDto,
  ): Promise<FacturacionCliente> {
    return this.facturacionService.create(clienteId, createDto);
  }

  @Patch('cliente/:clienteId')
  async update(
    @Param('clienteId') clienteId: string,
    @Body() updateDto: Partial<CreateFacturacionClienteDto>,
  ): Promise<FacturacionCliente> {
    return this.facturacionService.update(clienteId, updateDto);
  }

  @Delete('cliente/:clienteId')
  async delete(@Param('clienteId') clienteId: string): Promise<void> {
    return this.facturacionService.delete(clienteId);
  }
}
