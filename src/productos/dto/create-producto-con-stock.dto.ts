import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsUUID,
  IsInt,
  IsArray,
  Min,
  IsDateString,
  Matches,
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

  @IsOptional()
  @IsInt()
  @Min(1)
  piezasPorCaja?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioVentaPieza?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioVentaCaja?: number;

  @IsOptional()
  @Matches(/^\d{8}$/)
  claveProdServ?: string;

  @IsOptional()
  @Matches(/^[A-Z0-9]{3}$/)
  claveUnidad?: string;

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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clasesPermitidas?: string[];
}
