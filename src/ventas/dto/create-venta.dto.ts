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
import { DescuentoTipo } from '../../common/enums/descuento-tipo.enum';

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

  @IsNumber()
  @IsOptional()
  precioVenta?: number;
}

export class DescuentoInfoDto {
  @IsUUID()
  descuentoId: string;

  @IsEnum(DescuentoTipo)
  tipo: DescuentoTipo;

  @IsNumber()
  porcentaje: number;

  @IsNumber()
  monto: number;

  @IsString()
  motivo: string;
}

export class DescuentoPorProductoDto {
  @IsUUID()
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
  @Type(() => DescuentoInfoDto)
  mejorDescuento?: DescuentoInfoDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => DescuentoInfoDto)
  descuentoCategoriaInfo?: DescuentoInfoDto | null;
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
  @ValidateNested()
  @Type(() => DescuentosPreviewDto)
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
