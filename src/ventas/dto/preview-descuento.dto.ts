import {
  IsArray,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ProductoDescuentoItem {
  @IsUUID()
  productoId: string;

  @IsNumber()
  @Min(1)
  cantidad: number;
}

export class PreviewDescuentoDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductoDescuentoItem)
  productos: ProductoDescuentoItem[];

  @IsOptional()
  @IsUUID()
  clienteId?: string;
}
