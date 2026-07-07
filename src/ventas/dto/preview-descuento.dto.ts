import { IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ProductoDescuentoItem {
  @IsUUID()
  productoId: string;

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
