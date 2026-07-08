import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ConceptoDto {
  @IsString()
  noIdentificacion: string;

  @IsString()
  descripcion: string;

  @IsNumber()
  cantidad: number;

  @IsNumber()
  valorUnitario: number;

  @IsString()
  @IsOptional()
  claveProdServ?: string;

  @IsString()
  @IsOptional()
  claveUnidad?: string;

  @IsNumber()
  @IsOptional()
  ivaCfdi?: number | null;
}

export class EmisorDto {
  @IsString()
  rfc: string;

  @IsString()
  nombre: string;

  @IsString()
  @IsOptional()
  regimenFiscal?: string;
}

export class CfdiPreviewDto {
  @IsString()
  serie: string;

  @IsString()
  folio: string;

  @IsString()
  fecha: string;

  @IsNumber()
  subtotal: number;

  @IsNumber()
  total: number;

  @IsString()
  @IsOptional()
  uuidCfdi?: string;

  @ValidateNested()
  @Type(() => EmisorDto)
  emisor: EmisorDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConceptoDto)
  conceptos: ConceptoDto[];
}

export class ProductoRecepcionDto {
  @IsString()
  productoId: string;

  @IsString()
  @IsOptional()
  codigoBarras?: string;

  @IsString()
  nombre: string;

  @IsNumber()
  cantidad: number;

  @IsNumber()
  precio: number;

  @IsString()
  @IsOptional()
  claveProdServ?: string;

  @IsString()
  @IsOptional()
  claveUnidad?: string;

  @IsString()
  @IsOptional()
  laboratorioId?: string;

  @IsString()
  @IsOptional()
  loteId?: string;

  @IsString()
  @IsOptional()
  numeroLote?: string;

  @IsString()
  @IsOptional()
  fechaCaducidad?: string;

  @IsNumber()
  @IsOptional()
  stockMinimo?: number;

  @IsNumber()
  @IsOptional()
  stockMaximo?: number;

  @IsBoolean()
  esNuevo: boolean;
}

export class RecepcionConfirmadaDto {
  @IsString()
  xmlContent: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductoRecepcionDto)
  productos: ProductoRecepcionDto[];

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsString()
  @IsOptional()
  ordenCompraId?: string;
}
