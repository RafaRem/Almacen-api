import { Controller, Post, Get, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('configuracion')
@UseGuards(JwtAuthGuard)
export class ConfiguracionController {
  constructor(private readonly configuracionService: ConfiguracionService) {}

  @Post('inicializar')
  async inicializar(): Promise<{ message: string }> {
    await this.configuracionService.inicializarConfiguraciones();
    return { message: 'Configuraciones inicializadas' };
  }

  @Get(':clave')
  async getConfiguracion(@Param('clave') clave: string) {
    return this.configuracionService.getConfiguracion(clave);
  }

  @Put(':clave')
  async updateConfiguracion(
    @Param('clave') clave: string,
    @Body() body: { valor: Record<string, any> },
    @Request() req,
  ) {
    return this.configuracionService.updateConfiguracion(
      clave,
      body.valor,
      req.user?.userId || 'SYSTEM',
    );
  }
}