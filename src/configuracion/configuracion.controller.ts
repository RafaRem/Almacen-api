import { Controller, Post, Get, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FormaPagoNombres } from '../common/enums/forma-pago.enum';

@Controller('configuracion')
@UseGuards(JwtAuthGuard)
export class ConfiguracionController {
  constructor(private readonly configuracionService: ConfiguracionService) {}

  @Post('inicializar')
  async inicializar(): Promise<{ message: string }> {
    await this.configuracionService.inicializarConfiguraciones();
    return { message: 'Configuraciones inicializadas' };
  }

  @Get('forma-pago/nombres')
  async getFormaPagoNombres() {
    return FormaPagoNombres;
  }

  @Get('ticket')
  async getTicketConfig() {
    const config = await this.configuracionService.getConfiguracion('ticket');
    if (!config) {
      return { mensaje: '¡Gracias por su preferencia!' };
    }
    return { mensaje: config.valor?.mensaje || '¡Gracias por su preferencia!' };
  }

  @Put('ticket')
  async updateTicketConfig(
    @Body() body: { valor: { mensaje: string } },
    @Request() req,
  ) {
    return this.configuracionService.updateConfiguracion(
      'ticket',
      { mensaje: body.valor?.mensaje || '¡Gracias por su preferencia!' },
      req.user?.userId || 'SYSTEM',
    );
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