import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentoCliente } from './entities/documento-cliente.entity';
import { CreateDocumentoClienteDto } from './dto/create-documento-cliente.dto';
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
export class UploadsService {
  constructor(
    @InjectRepository(DocumentoCliente)
    private documentosRepository: Repository<DocumentoCliente>,
  ) {}

  async upload(
    file: MulterFile,
    createDto: CreateDocumentoClienteDto,
  ): Promise<DocumentoCliente> {
    if (!file) {
      throw new BadRequestException('No se proporcionó archivo');
    }

    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Tipo de archivo no permitido. Solo PDF, JPG, PNG',
      );
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(
        'El archivo excede el tamaño máximo de 10MB',
      );
    }

    const uploadsDir = path.join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'uploads',
      'clientes',
      createDto.clienteId,
    );
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    fs.writeFileSync(filePath, file.buffer);

    const relativePath = path.join(
      'uploads',
      'clientes',
      createDto.clienteId,
      fileName,
    );

    const documento = this.documentosRepository.create({
      ...createDto,
      rutaArchivo: relativePath,
      mimeType: file.mimetype,
      tamano: file.size,
    });

    return this.documentosRepository.save(documento);
  }

  async findByCliente(clienteId: string): Promise<DocumentoCliente[]> {
    return this.documentosRepository.find({
      where: { clienteId, statusId: 1 },
      order: { fechaSubida: 'DESC' },
    });
  }

  async findOne(id: string): Promise<DocumentoCliente> {
    const documento = await this.documentosRepository.findOne({
      where: { id },
    });
    if (!documento) {
      throw new NotFoundException(`Documento with ID ${id} not found`);
    }
    return documento;
  }

  async updateVigencia(
    id: string,
    vigencia: string,
  ): Promise<DocumentoCliente> {
    const documento = await this.findOne(id);
    documento.vigencia = new Date(vigencia);
    return this.documentosRepository.save(documento);
  }

  async remove(id: string): Promise<void> {
    const documento = await this.findOne(id);
    documento.statusId = 2;
    await this.documentosRepository.save(documento);
  }

  async getFilePath(id: string): Promise<string> {
    const documento = await this.findOne(id);
    return path.join(__dirname, '..', '..', '..', '..', documento.rutaArchivo);
  }
}
