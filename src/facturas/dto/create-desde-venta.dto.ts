import { IsOptional, IsString, IsEnum } from 'class-validator'
import { MetodoPagoSat } from '../../common/enums/metodo-pago-sat.enum'

export class CreateFacturaDesdeVentaDto {
  @IsOptional()
  @IsString()
  serie?: string

  @IsOptional()
  @IsString()
  lugarExpedicion?: string

  @IsOptional()
  @IsEnum(MetodoPagoSat)
  metodoPago?: MetodoPagoSat

  @IsOptional()
  @IsString()
  usoCfdi?: string

  @IsOptional()
  @IsString()
  observaciones?: string
}
