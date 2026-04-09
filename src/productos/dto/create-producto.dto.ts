import { IsString, IsNotEmpty, IsOptional, IsNumber, IsUUID, IsInt } from 'class-validator';

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

  @IsUUID()
  @IsNotEmpty()
  laboratorioId: string;

  @IsUUID()
  @IsNotEmpty()
  loteId: string;

  @IsOptional()
  @IsNumber()
  stock?: number;

  @IsOptional()
  @IsNumber()
  stockMinimo?: number;

  @IsOptional()
  @IsInt()
  statusId?: number;
}