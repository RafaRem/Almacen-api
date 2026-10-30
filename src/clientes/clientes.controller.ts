import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { CreateClienteDto, UpdateClienteDto } from './dto/create-cliente.dto';
import {
  CreateClienteFullDto,
  UpdateClienteFullDto,
} from './dto/cliente-full.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createClienteDto: CreateClienteDto) {
    return this.clientesService.create(createClienteDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('statusId') statusId?: string,
    @Query('nombre') nombre?: string,
  ) {
    return this.clientesService.findAll(statusId, nombre);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.clientesService.findOne(id);
  }

  @Post('full')
  @UseGuards(JwtAuthGuard)
  createFull(@Body() dto: CreateClienteFullDto, @Request() req: any) {
    return this.clientesService.createFull(dto, req.user?.id);
  }

  @Patch(':id/full')
  @UseGuards(JwtAuthGuard)
  updateFull(
    @Param('id') id: string,
    @Body() dto: UpdateClienteFullDto,
    @Request() req: any,
  ) {
    return this.clientesService.updateFull(id, dto, req.user?.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateClienteDto: UpdateClienteDto) {
    return this.clientesService.update(id, updateClienteDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.clientesService.remove(id);
  }
}
