import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsIn,
} from 'class-validator';

export class ReabastecerDto {
  @IsUUID()
  @IsNotEmpty()
  productoId: string;

  @IsOptional()
  @IsUUID()
  proveedorId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  cantidad?: number;

  @IsOptional()
  @IsIn(['PIEZA', 'CAJA'])
  presentacionTipo?: 'PIEZA' | 'CAJA';

  @IsOptional()
  @IsBoolean()
  preview?: boolean;

  @IsOptional()
  @IsBoolean()
  confirmarPendiente?: boolean;
}
