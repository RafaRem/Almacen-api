import { IsEnum, IsOptional, IsDateString, IsString } from 'class-validator';
import { TipoDocumento } from '../../common/enums/tipo-documento.enum';

export class CreateDocumentoClienteDto {
  @IsEnum(TipoDocumento)
  tipoDocumento: TipoDocumento;

  @IsString()
  clienteId: string;

  @IsString()
  nombreArchivo: string;

  @IsString()
  rutaArchivo: string;

  @IsString()
  mimeType: string;

  @IsOptional()
  @IsDateString()
  vigencia?: string;
}

export class UpdateDocumentoClienteDto {
  @IsOptional()
  @IsDateString()
  vigencia?: string;

  @IsOptional()
  @IsEnum(TipoDocumento)
  tipoDocumento?: TipoDocumento;
}