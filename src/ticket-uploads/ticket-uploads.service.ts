import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracionSistema } from '../configuracion/entities/configuracion-sistema.entity';
import * as fs from 'fs';
import * as path from 'path';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class TicketUploadsService {
  private readonly uploadsDir = path.join(process.cwd(), 'uploads', 'ticket');

  constructor(
    @InjectRepository(ConfiguracionSistema)
    private configuracionRepository: Repository<ConfiguracionSistema>,
  ) {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async saveLogo(file: MulterFile, userId: string): Promise<{ logoUrl: string }> {
    if (!file) {
      throw new BadRequestException('No se proporcionó archivo');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de archivo no permitido. Solo JPG, PNG, GIF, WEBP');
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('El archivo excede el tamaño máximo de 2MB');
    }

    const previousLogo = await this.getLogoUrl();
    if (previousLogo) {
      try {
        const oldPath = path.join(process.cwd(), previousLogo.replace(/^\//, ''));
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      } catch (e) {
        console.error('Error deleting previous logo:', e);
      }
    }

    const ext = path.extname(file.originalname);
    const fileName = `logo${ext}`;
    const filePath = path.join(this.uploadsDir, fileName);

    fs.writeFileSync(filePath, file.buffer);

    const logoUrl = `/uploads/ticket/${fileName}`;

    await this.saveLogoUrl(logoUrl, userId);

    return { logoUrl };
  }

  async getLogoUrl(): Promise<string | null> {
    const config = await this.configuracionRepository.findOne({
      where: { clave: 'ticket_logo' },
    });
    return config?.valor?.logoUrl || null;
  }

  async deleteLogo(userId: string): Promise<{ success: boolean }> {
    const logoUrl = await this.getLogoUrl();
    if (logoUrl) {
      try {
        const filePath = path.join(process.cwd(), logoUrl.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        console.error('Error deleting logo file:', e);
      }
    }

    const config = await this.configuracionRepository.findOne({
      where: { clave: 'ticket_logo' },
    });
    if (config) {
      config.activo = false;
      await this.configuracionRepository.save(config);
    }

    return { success: true };
  }

  private async saveLogoUrl(logoUrl: string, userId: string): Promise<void> {
    let config = await this.configuracionRepository.findOne({
      where: { clave: 'ticket_logo' },
    });

    if (config) {
      config.valor = { logoUrl };
      config.updatedBy = userId;
      config.activo = true;
    } else {
      config = this.configuracionRepository.create({
        clave: 'ticket_logo',
        valor: { logoUrl },
        descripcion: 'URL del logo para tickets',
        updatedBy: userId,
        activo: true,
      });
    }

    await this.configuracionRepository.save(config);
  }
}