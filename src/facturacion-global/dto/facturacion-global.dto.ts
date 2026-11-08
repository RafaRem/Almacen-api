import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export const PERIODICIDADES = ['01', '02', '03', '04'] as const;

export class PeriodoGlobalDto {
  @IsIn(PERIODICIDADES)
  periodicidad: string;

  @IsOptional()
  @IsDateString()
  fechaReferencia?: string;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;
}

export class GenerarGlobalDto extends PeriodoGlobalDto {
  @IsOptional()
  @IsString()
  serie?: string;
}

export class CancelarGlobalDto {
  @IsOptional()
  @IsString()
  motivo?: string;
}

export class CorregirGlobalDto {
  @IsUUID()
  ventaId: string;
}
