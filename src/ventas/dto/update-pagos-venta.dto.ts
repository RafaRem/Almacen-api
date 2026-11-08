import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { FormaPago } from '../../common/enums/forma-pago.enum';

export class PagoVentaUpdateDto {
  @IsUUID()
  id: string;

  @IsEnum(FormaPago)
  formaPago: FormaPago;

  @IsNumber()
  @Min(0.01)
  monto: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  referencia?: string;
}

export class UpdatePagosVentaDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PagoVentaUpdateDto)
  pagos: PagoVentaUpdateDto[];
}
