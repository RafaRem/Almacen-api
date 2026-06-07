import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CreditosService, CreateCreditoDto } from './creditos.service';
import { Credito } from './entities/credito.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
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
    @Request() req,
  ): Promise<Credito> {
    return this.creditosService.create(clienteId, createDto, req.user?.id);
  }

  @Patch('cliente/:clienteId')
  async update(
    @Param('clienteId') clienteId: string,
    @Body() updateDto: Partial<CreateCreditoDto>,
    @Request() req,
  ): Promise<Credito> {
    return this.creditosService.update(clienteId, updateDto, req.user?.id);
  }

  @Post('cliente/:clienteId/usar')
  async usarCredito(
    @Param('clienteId') clienteId: string,
    @Body() body: { monto: number },
    @Request() req,
  ): Promise<Credito> {
    return this.creditosService.usarCredito(clienteId, body.monto, req.user?.id);
  }

  @Delete('cliente/:clienteId')
  async delete(@Param('clienteId') clienteId: string): Promise<void> {
    return this.creditosService.delete(clienteId);
  }
}
