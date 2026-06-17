import { IsString, IsOptional, IsUUID, IsDateString, IsArray, ValidateNested, IsInt, Min, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDetalleDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  cantidad?: number;

  @IsOptional()
  @IsNumber()
  precioEstimado?: number;
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
