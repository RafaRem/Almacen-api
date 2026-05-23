import { IsOptional, IsNumber } from 'class-validator';

export class UpdateInventarioAlmacenDto {
  @IsOptional()
  @IsNumber()
  ivaPersonalizado?: number;
}
