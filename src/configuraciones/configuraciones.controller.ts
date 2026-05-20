import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfiguracionesService } from './configuraciones.service';

@Controller('configuraciones')
export class ConfiguracionesController {
  constructor(
    private readonly configuracionesService: ConfiguracionesService,
  ) {}

  @Get(':clave')
  @UseGuards(JwtAuthGuard)
  async getByClave(@Param('clave') clave: string) {
    const config = await this.configuracionesService.getByClave(clave);
    if (!config) {
      return { clave, valor: null };
    }
    return { clave: config.clave, valor: Number(config.valor) };
  }

  @Patch(':clave')
  @UseGuards(JwtAuthGuard)
  async updateValor(
    @Param('clave') clave: string,
    @Body() body: { valor: number },
  ) {
    const config = await this.configuracionesService.setValor(
      clave,
      body.valor,
    );
    return { clave: config.clave, valor: Number(config.valor) };
  }
}
