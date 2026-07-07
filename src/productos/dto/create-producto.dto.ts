import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
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
  @IsNumber()
  statusId?: number;
}
