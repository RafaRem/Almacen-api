import { IsOptional, IsNumber, ValidateIf } from 'class-validator';

export class UpdateInventarioAlmacenDto {
  @IsOptional()
  @IsNumber()
  ivaPersonalizado?: number;

  @ValidateIf((o) => o.precioVenta !== undefined)
  @IsNumber()
  precioVenta?: number | null;
}
