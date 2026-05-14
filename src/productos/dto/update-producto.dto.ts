import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
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
  @IsUUID()
  laboratorioId?: string;

  @IsOptional()
  @IsUUID()
  loteId?: string;

  @IsOptional()
  @IsNumber()
  stock?: number;

  @IsOptional()
  @IsNumber()
  stockMinimo?: number;

  @IsOptional()
  @IsNumber()
  stockMaximo?: number;

  @IsOptional()
  @IsNumber()
  precio?: number;

  @IsOptional()
  @IsNumber()
  margenRecomendado?: number;

  @IsOptional()
  @IsEnum(StatusId)
  statusId?: StatusId;
}
