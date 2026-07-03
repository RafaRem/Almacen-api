import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsUUID,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';

export class CreateProductoConStockDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsString()
  @IsNotEmpty()
  codigoBarras: string;

  @IsUUID()
  @IsNotEmpty()
  laboratorioId: string;

  @IsString()
  @IsNotEmpty()
  numeroLote: string;

  @IsOptional()
  @IsDateString()
  fechaCaducidad?: string;

  @IsNumber()
  @Min(0.01)
  precioUnitarioLote: number;

  @IsOptional()
  @IsNumber()
  ivaCfdi?: number;

  @IsNumber()
  @Min(1)
  cantidad: number;

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
  @IsInt()
  statusId?: number;
}
