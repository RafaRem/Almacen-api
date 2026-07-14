import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
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
  @IsBoolean()
  preview?: boolean;
}
