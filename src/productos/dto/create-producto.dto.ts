import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateProductoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsString()
  @IsNotEmpty()
  codigoBarras: string;

  @IsString()
  @IsNotEmpty()
  laboratorioId: string;

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
  @Matches(/^\d{8}$/)
  claveProdServ?: string;

  @IsOptional()
  @Matches(/^[A-Z0-9]{3}$/)
  claveUnidad?: string;

  @IsOptional()
  @IsNumber()
  statusId?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clasesPermitidas?: string[];
}
