import { Type } from 'class-transformer';
import {
  IsOptional,
  IsUUID,
  IsNumber,
  IsString,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
} from 'class-validator';
import { TipoComprobante } from '../../common/enums/tipo-comprobante.enum';
import { MetodoPagoSat } from '../../common/enums/metodo-pago-sat.enum';

export class ProductoFacturaUpdateDto {
  @IsOptional()
  @IsUUID()
  productoId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  cantidad?: number;

  @IsOptional()
  @IsNumber()
  precioUnitario?: number;

  @IsOptional()
  @IsNumber()
  descuento?: number;

  @IsOptional()
  @IsUUID()
  loteId?: string;
}

export class UpdateFacturaDto {
  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @IsOptional()
  @IsString()
  serie?: string;

  @IsOptional()
  @IsNumber()
  folio?: number;

  @IsOptional()
  @IsEnum(TipoComprobante)
  tipoComprobante?: TipoComprobante;

  @IsOptional()
  @IsString()
  lugarExpedicion?: string;

  @IsOptional()
  @IsString()
  formaPago?: string;

  @IsOptional()
  @IsEnum(MetodoPagoSat)
  metodoPago?: MetodoPagoSat;

  @IsOptional()
  @IsString()
  usoCfdi?: string;

  @IsOptional()
  @IsString()
  moneda?: string;

  @IsOptional()
  @IsNumber()
  tipoCambio?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductoFacturaUpdateDto)
  productos?: ProductoFacturaUpdateDto[];
}