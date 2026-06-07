import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsEnum,
  IsUUID,
  ValidateIf,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MetodoPago } from '../../common/enums/metodo-pago.enum';
import { PagoDetalleDto } from './pago-detalle.dto';

export class ProductoVentaDto {
  @IsUUID()
  @IsNotEmpty()
  productoId: string;

  @IsOptional()
  @ValidateIf((o) => o.loteId !== null)
  @IsUUID()
  loteId?: string | null;

  @IsInt()
  @Min(1)
  cantidad: number;
}

export class DescuentosPreviewDto {
  @IsNumber()
  descuentoAplicado: number;

  @IsNumber()
  total: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DescuentoPorProductoDto)
  descuentoPorProducto: DescuentoPorProductoDto[];
}

export class MejorDescuentoDto {
  @IsUUID()
  @IsOptional()
  descuentoId?: string;

  @IsString()
  tipo: string;

  @IsNumber()
  porcentaje: number;

  @IsNumber()
  @IsOptional()
  monto?: number | null;

  @IsNumber()
  precioConDescuento: number;

  @IsString()
  motivo: string;
}

export class DescuentoCategoriaInfoDto {
  @IsUUID()
  @IsOptional()
  descuentoId?: string;

  @IsString()
  tipo: string;

  @IsNumber()
  porcentaje: number;

  @IsNumber()
  @IsOptional()
  monto?: number | null;

  @IsString()
  motivo: string;
}

export class DescuentoPorProductoDto {
  @IsUUID()
  @IsNotEmpty()
  productoId: string;

  @IsNumber()
  descuento: number;

  @IsNumber()
  descuentoProducto: number;

  @IsNumber()
  descuentoCategoria: number;

  @IsString()
  motivo: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MejorDescuentoDto)
  mejorDescuento?: MejorDescuentoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DescuentoCategoriaInfoDto)
  descuentoCategoriaInfo?: DescuentoCategoriaInfoDto;
}

export class CreateVentaDto {
  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @IsOptional()
  @IsEnum(MetodoPago)
  metodoPago?: MetodoPago;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PagoDetalleDto)
  pagos?: PagoDetalleDto[];

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductoVentaDto)
  productos: ProductoVentaDto[];

  @IsOptional()
  descuentosPreview?: DescuentosPreviewDto;
}

export class UpdateVentaDto {
  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsInt()
  statusId?: number;
}