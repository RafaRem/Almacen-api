import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CfdiService } from './cfdi.service';
import { CfdiPreviewDto, RecepcionConfirmadaDto } from './dto/procesar-recepcion.dto';

@Controller('cfdi')
export class CfdiController {
  constructor(private readonly cfdiService: CfdiService) {}

  @Post('preview')
  @UseGuards(JwtAuthGuard)
  async preview(@Body() body: { xmlContent: string }): Promise<CfdiPreviewDto> {
    return this.cfdiService.parseXmlToPreview(body.xmlContent);
  }

  @Post('validar')
  @UseGuards(JwtAuthGuard)
  async validar(@Body() body: { xmlContent: string }) {
    return this.cfdiService.validarXml(body.xmlContent);
  }

  @Post('recepcion')
  @UseGuards(JwtAuthGuard)
  async procesarRecepcion(
    @Body() dto: RecepcionConfirmadaDto,
    @Req() req: any,
  ) {
    const userId = req.user.id || req.user.sub || 'system';
    return this.cfdiService.procesarRecepcion(dto, userId);
  }
}
