import { IsOptional, IsNumber } from 'class-validator';

export class UpdateInventarioAlmacenDto {
  @IsOptional()
  @IsNumber()
  ivaPersonalizado?: number;

  @IsOptional()
  @IsNumber()
  precioVenta?: number | null;

  @IsOptional()
  @IsNumber()
  precioVentaCaja?: number | null;
}
