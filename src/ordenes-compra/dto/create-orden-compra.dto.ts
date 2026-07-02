import {
  IsString,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDetalleDto {
  @IsUUID()
  @IsNotEmpty()
  productoId: string;

  @IsInt()
  @Min(1)
  cantidad: number;

  @IsOptional()
  @IsNumber()
  precioEstimado?: number;
}

export class CreateOrdenCompraDto {
  @IsUUID()
  @IsNotEmpty()
  proveedorId: string;

  @IsOptional()
  @IsDateString()
  fechaOrden?: string;

  @IsOptional()
  @IsDateString()
  fechaEsperada?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDetalleDto)
  detalles?: CreateDetalleDto[];
}

export class RecibirDetalleDto {
  @IsUUID()
  @IsNotEmpty()
  detalleId: string;

  @IsInt()
  @Min(1)
  cantidadRecibida: number;

  @IsString()
  @IsNotEmpty()
  numeroLote: string;

  @IsDateString()
  fechaCaducidad: string;
}

export class RecibirOrdenCompraDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecibirDetalleDto)
  detalles: RecibirDetalleDto[];
}
