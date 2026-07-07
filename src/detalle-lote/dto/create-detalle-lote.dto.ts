import { IsUUID, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateDetalleLoteDto {
  @IsUUID()
  productoId: string;

  @IsUUID()
  loteId: string;

  @IsNumber()
  @Min(0)
  cantidad: number;

  @IsNumber()
  @Min(0)
  precioUnitario: number;

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
