import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { CreateDocumentoClienteDto } from './dto/create-documento-cliente.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StreamableFile } from '@nestjs/common';
import * as fs from 'fs';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: any,
    @Body() createDto: CreateDocumentoClienteDto,
  ) {
    return this.uploadsService.upload(file, createDto);
  }

  @Get('cliente/:clienteId')
  @UseGuards(JwtAuthGuard)
  findByCliente(@Param('clienteId') clienteId: string) {
    return this.uploadsService.findByCliente(clienteId);
  }

  @Get(':id/descargar')
  @UseGuards(JwtAuthGuard)
  async download(@Param('id') id: string, @Res() res: any): Promise<any> {
    const filePath = await this.uploadsService.getFilePath(id);
    const documento = await this.uploadsService.findOne(id);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    res.set({
      'Content-Type': documento.mimeType,
      'Content-Disposition': `attachment; filename="${documento.nombreArchivo}"`,
    });

    const file = fs.createReadStream(filePath);
    return new StreamableFile(file);
  }

  @Patch(':id/vigencia')
  @UseGuards(JwtAuthGuard)
  updateVigencia(@Param('id') id: string, @Body('vigencia') vigencia: string) {
    return this.uploadsService.updateVigencia(id, vigencia);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.uploadsService.remove(id);
  }
}
