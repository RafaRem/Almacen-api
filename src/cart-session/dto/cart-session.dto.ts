import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LotItemDto {
  @IsString()
  @IsOptional()
  loteId?: string | null;

  @IsNumber()
  @IsOptional()
  cantidadBase?: number;

  @IsNumber()
  @IsOptional()
  factorUnidades?: number;

  @IsString()
  @IsOptional()
  numeroLote?: string;

  @IsNumber()
  @IsOptional()
  cantidad?: number;

  @IsString()
  @IsOptional()
  fechaCaducidad?: string | null;

  @IsNumber()
  @IsOptional()
  precioUnitarioLote?: number;

  @IsNumber()
  @IsOptional()
  ivaCfdi?: number;

  @IsNumber()
  @IsOptional()
  precioVenta?: number;
}

export class CartItemDto {
  @IsString()
  id: string;

  @IsString()
  nombre: string;

  @IsNumber()
  precio: number;

  @IsNumber()
  quantity: number;

  @IsString()
  @IsOptional()
  loteId?: string | null;

  @IsString()
  @IsOptional()
  numeroLote?: string;

  @IsString()
  @IsOptional()
  fechaCaducidad?: string | null;

  @IsNumber()
  @IsOptional()
  precioUnitarioLote?: number;

  @IsNumber()
  @IsOptional()
  ivaTasa?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LotItemDto)
  @IsOptional()
  itemsPorLote?: LotItemDto[];

  @IsNumber()
  @IsOptional()
  stock?: number;

  @IsNumber()
  @IsOptional()
  stockTotal?: number;

  @IsNumber()
  @IsOptional()
  cantidadTotal?: number;

  @IsNumber()
  @IsOptional()
  precioUnitarioOriginal?: number;

  @IsString()
  @IsOptional()
  numeroLoteDisplay?: string;

  @IsBoolean()
  @IsOptional()
  ivaDelProducto?: boolean;

  @IsNumber()
  @IsOptional()
  cantidadBase?: number;

  @IsNumber()
  @IsOptional()
  factorUnidades?: number;

  @IsString()
  @IsOptional()
  presentacionId?: string | null;

  @IsString()
  @IsOptional()
  presentacionNombre?: string | null;

  @IsString()
  @IsOptional()
  tipoPresentacion?: string | null;

  @IsString()
  @IsOptional()
  presentacionTipo?: string | null;

  @IsString()
  @IsOptional()
  lineId?: string;
}

export class SavedCartDto {
  @IsString()
  id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];

  @IsNumber()
  itemCount: number;

  @IsString()
  createdAt: string;

  @IsOptional()
  @IsString()
  updatedAt?: string;
}

export class CartSessionDto {
  @IsString()
  userId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SavedCartDto)
  carts: SavedCartDto[];

  @IsString()
  lastModified: string;
}

export class SaveCartDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SavedCartDto)
  carts: SavedCartDto[];
}

export class CartSessionResponseDto {
  userId: string;
  carts: SavedCartDto[];
  lastModified: string;
}
