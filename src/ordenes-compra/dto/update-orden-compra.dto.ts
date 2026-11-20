import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDetalleDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsUUID()
  productoId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  cantidad?: number;

  @IsOptional()
  @IsIn(['PIEZA', 'CAJA'])
  presentacionTipo?: 'PIEZA' | 'CAJA';
}

export class UpdateOrdenCompraDto {
  @IsOptional()
  @IsUUID()
  proveedorId?: string;

  @IsOptional()
  @IsDateString()
  fechaOrden?: string;

  @IsOptional()
  @IsDateString()
  fechaEsperada?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateDetalleDto)
  detalles?: UpdateDetalleDto[];
}
