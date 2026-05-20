import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { CreditosService, CreateCreditoDto } from './creditos.service';
import { Credito } from './entities/credito.entity';

@Controller('creditos')
export class CreditosController {
  constructor(private readonly creditosService: CreditosService) {}

  @Get('cliente/:clienteId')
  async findByCliente(
    @Param('clienteId') clienteId: string,
  ): Promise<Credito | null> {
    return this.creditosService.findByCliente(clienteId);
  }

  @Get('cliente/:clienteId/disponible')
  async getDisponible(
    @Param('clienteId') clienteId: string,
  ): Promise<{ disponible: number }> {
    const disponible = await this.creditosService.getDisponible(clienteId);
    return { disponible };
  }

  @Post('cliente/:clienteId')
  async create(
    @Param('clienteId') clienteId: string,
    @Body() createDto: CreateCreditoDto,
  ): Promise<Credito> {
    return this.creditosService.create(clienteId, createDto);
  }

  @Patch('cliente/:clienteId')
  async update(
    @Param('clienteId') clienteId: string,
    @Body() updateDto: Partial<CreateCreditoDto>,
  ): Promise<Credito> {
    return this.creditosService.update(clienteId, updateDto);
  }

  @Post('cliente/:clienteId/usar')
  async usarCredito(
    @Param('clienteId') clienteId: string,
    @Body() body: { monto: number },
  ): Promise<Credito> {
    return this.creditosService.usarCredito(clienteId, body.monto);
  }

  @Delete('cliente/:clienteId')
  async delete(@Param('clienteId') clienteId: string): Promise<void> {
    return this.creditosService.delete(clienteId);
  }
}
