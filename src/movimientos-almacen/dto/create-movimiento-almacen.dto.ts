import {
  IsUUID,
  IsNumber,
  IsPositive,
  IsEnum,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { AlmacenTipo } from '../../common/enums/almacen-tipo.enum';

export class CreateMovimientoAlmacenDto {
  @IsUUID()
  productoId: string;

  @IsUUID()
  loteId: string;

  @IsEnum(AlmacenTipo)
  almacenOrigen: AlmacenTipo;

  @ValidateIf((o) => o.almacenDestino !== null)
  @IsEnum(AlmacenTipo)
  almacenDestino: AlmacenTipo | null;

  @IsNumber()
  @Min(1)
  cantidad: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
