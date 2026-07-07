import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { StatusId } from '../../common/enums/status-id.enum';

export class UpdateProductoDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  codigoBarras?: string;

  @IsOptional()
  @IsString()
  laboratorioId?: string;

  @IsOptional()
  @IsNumber()
  stockMinimo?: number;

  @IsOptional()
  @IsNumber()
  stockMaximo?: number;

  @IsOptional()
  @IsNumber()
  margenRecomendado?: number;

  @IsOptional()
  @IsString()
  proveedorPreferidoId?: string;

  @IsOptional()
  @IsEnum(StatusId)
  statusId?: StatusId;
}
