import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  Min,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { StatusId } from '../../common/enums/status-id.enum';
import { DescuentoTipo } from '../../common/enums/descuento-tipo.enum';

export class CreateDescuentoDto {
  @IsEnum(DescuentoTipo)
  tipo: DescuentoTipo;

  @IsOptional()
  condiciones?: Record<string, any>;

  @IsNumber()
  @Min(0)
  porcentaje: number;

  @IsOptional()
  @IsUUID()
  laboratorioId?: string;

  @IsOptional()
  @IsUUID()
  categoriaClienteId?: string;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  prioridad?: number;

  @IsOptional()
  @IsBoolean()
  acumulable?: boolean;

  @IsOptional()
  @IsInt()
  statusId?: number;
}

export class UpdateDescuentoDto {
  @IsOptional()
  @IsEnum(DescuentoTipo)
  tipo?: DescuentoTipo;

  @IsOptional()
  condiciones?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  porcentaje?: number;

  @IsOptional()
  @IsUUID()
  laboratorioId?: string;

  @IsOptional()
  @IsUUID()
  categoriaClienteId?: string;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  @IsEnum(StatusId)
  statusId?: StatusId;

  @IsOptional()
  prioridad?: number;

  @IsOptional()
  @IsBoolean()
  acumulable?: boolean;
}

export class CalcularDescuentoDto {
  @IsUUID()
  productoId: string;

  @IsNumber()
  @Min(1)
  cantidad: number;

  @IsOptional()
  @IsUUID()
  clienteId?: string;
}
