import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { FormaPago } from '../../common/enums/forma-pago.enum';

export class PagoDetalleDto {
  @IsEnum(FormaPago)
  formaPago: FormaPago;

  @IsNumber()
  @Min(0.01)
  monto: number;

  @IsOptional()
  @IsString()
  referencia?: string;
}
