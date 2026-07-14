import { IsUUID, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateDetalleLoteDto {
  @IsOptional()
  @IsUUID()
  productoId?: string;

  @IsOptional()
  @IsUUID()
  loteId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cantidad?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioUnitario?: number;

  @IsOptional()
  @IsNumber()
  ivaCfdi?: number;

  @IsOptional()
  @IsUUID()
  movimientoId?: string;

  @IsOptional()
  @IsNumber()
  almacenTipo?: number;
}
