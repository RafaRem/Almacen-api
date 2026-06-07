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
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { CreateDocumentoClienteDto } from './dto/create-documento-cliente.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StreamableFile } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

function sanitizeFilename(name: string): string {
  return path.basename(name).replace(/["\r\n;]/g, '').substring(0, 255);
}

@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly uploadsService: UploadsService,
  ) {}

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
      'Content-Disposition': `attachment; filename="${sanitizeFilename(documento.nombreArchivo)}"`,
    });

    const file = fs.createReadStream(filePath);
    return new StreamableFile(file);
  }

  @Get(':id/ver')
  @UseGuards(JwtAuthGuard)
  async ver(@Param('id') id: string, @Res() res: any): Promise<any> {
    const filePath = await this.uploadsService.getFilePath(id);
    const documento = await this.uploadsService.findOne(id);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    res.setHeader('Content-Type', documento.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${sanitizeFilename(documento.nombreArchivo)}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    return new Promise<void>((resolve, reject) => {
      fileStream.on('end', () => resolve());
      fileStream.on('error', (err) => reject(err));
    });
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
