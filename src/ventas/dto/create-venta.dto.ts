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
} from 'class-validator';
import { Type } from 'class-transformer';
import { MetodoPago } from '../../common/enums/metodo-pago.enum';
import { PagoDetalleDto } from './pago-detalle.dto';

export class ProductoVentaDto {
  @IsUUID()
  @IsNotEmpty()
  productoId: string;

  @IsOptional()
  @IsUUID()
  loteId?: string;

  @IsInt()
  @Min(1)
  cantidad: number;
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
  descuentoPreview?: {
    descuentoAplicado: number;
    total: number;
  };
}

export class UpdateVentaDto {
  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsInt()
  statusId?: number;
}
