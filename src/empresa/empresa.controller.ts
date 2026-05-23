import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { EmpresaService } from './empresa.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('empresa')
@UseGuards(JwtAuthGuard)
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) {}

  @Get()
  async getDatosEmpresa() {
    return this.empresaService.getDatosEmpresa();
  }

  @Put()
  async updateDatosEmpresa(
    @Body()
    data: Partial<{
      nombre: string;
      rfc: string;
      direccion: string;
      telefono: string;
      email: string;
      regimenFiscal: string;
      cp: string;
      ciudad: string;
      estado: string;
    }>,
  ) {
    return this.empresaService.updateDatosEmpresa(data);
  }
}
