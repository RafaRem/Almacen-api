import { IsArray, IsOptional, IsString, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CartItemDto {
  @IsNumber()
  id: number;

  @IsString()
  nombre: string;

  @IsNumber()
  precio: number;

  @IsNumber()
  quantity: number;

  @IsNumber()
  @IsOptional()
  loteId?: number | null;

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
