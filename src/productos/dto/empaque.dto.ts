import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EmpaqueFactorDto {
  @IsInt()
  @Min(1)
  piezasPorCaja: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioVentaCaja?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioVentaPieza?: number | null;
}

export class EmpaqueLoteFactorDto {
  @IsInt()
  @Min(2)
  piezasPorCaja: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioVentaCaja?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioVentaPieza?: number | null;
}

export class EmpaqueLoteDto {
  @IsUUID()
  loteId: string;

  @IsInt()
  @Min(2)
  piezasPorCaja: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioVentaCaja?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioVentaPieza?: number;
}

export class EmpaquePreviewDto {
  @IsOptional()
  @IsInt()
  @Min(2)
  piezasPorCaja?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmpaqueLoteDto)
  lotes?: EmpaqueLoteDto[];
}

export class EmpaqueConvertirDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmpaqueLoteDto)
  lotes: EmpaqueLoteDto[];
}
