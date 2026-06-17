import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StatusId } from '../../common/enums/status-id.enum';
import { DescuentoTipo } from '../../common/enums/descuento-tipo.enum';

export class CreateDescuentoDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsEnum(DescuentoTipo)
  tipo: DescuentoTipo;

  @IsOptional()
  condiciones?: Record<string, any>;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  porcentaje: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monto?: number;

  @IsOptional()
  @IsUUID()
  laboratorioId?: string;

  @IsOptional()
  @IsUUID()
  categoriaClienteId?: string;

  @IsOptional()
  @IsUUID('4', { each: true })
  productoIds?: string[];

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  prioridad?: number;

  @IsOptional()
  acumulable?: boolean;

  @IsOptional()
  @IsEnum(StatusId)
  statusId?: StatusId;
}

export class UpdateDescuentoDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(DescuentoTipo)
  tipo?: DescuentoTipo;

  @IsOptional()
  condiciones?: Record<string, any>;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  porcentaje?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monto?: number;

  @IsOptional()
  @IsUUID()
  laboratorioId?: string;

  @IsOptional()
  @IsUUID()
  categoriaClienteId?: string;

  @IsOptional()
  @IsUUID('4', { each: true })
  productoIds?: string[];

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  prioridad?: number;

  @IsOptional()
  acumulable?: boolean;

  @IsOptional()
  @IsEnum(StatusId)
  statusId?: StatusId;
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

  @IsOptional()
  @IsUUID()
  laboratorioId?: string;

  @IsOptional()
  @IsDateString()
  fechaCaducidad?: string;
}

export class PreviewProductDiscountDto {
  @IsUUID()
  productoId: string;

  @IsNumber()
  @Min(1)
  cantidad: number;

  @IsNumber()
  @Min(0)
  precioUnitario: number;

  @IsNumber()
  iva: number;

  @IsNumber()
  margen: number;

  @IsUUID()
  laboratorioId: string;

  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @IsOptional()
  @IsDateString()
  fechaCaducidad?: string;
}
