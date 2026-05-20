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

export class ProductoFacturaDto {
  @IsUUID()
  productoId: string;

  @IsNumber()
  @Min(1)
  cantidad: number;

  @IsOptional()
  @IsNumber()
  precioUnitario?: number;

  @IsOptional()
  @IsNumber()
  descuento?: number;

  @IsOptional()
  @IsUUID()
  loteId?: string;

  @IsOptional()
  @IsNumber()
  tasaImpuesto?: number;
}

export class CreateFacturaDto {
  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @IsOptional()
  @IsString()
  serie?: string;

  @IsEnum(TipoComprobante)
  tipoComprobante: TipoComprobante;

  @IsOptional()
  @IsString()
  lugarExpedicion?: string;

  @IsOptional()
  @IsString()
  formaPago?: string;

  @IsEnum(MetodoPagoSat)
  metodoPago: MetodoPagoSat;

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
  @IsString()
  emisorNombre?: string;

  @IsOptional()
  @IsString()
  emisorRfc?: string;

  @IsOptional()
  @IsString()
  emisorRegimenFiscal?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductoFacturaDto)
  productos: ProductoFacturaDto[];
}
