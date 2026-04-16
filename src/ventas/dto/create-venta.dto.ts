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

  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductoVentaDto)
  productos: ProductoVentaDto[];
}

export class UpdateVentaDto {
  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsInt()
  statusId?: number;
}
