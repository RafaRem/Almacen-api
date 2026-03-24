import { IsUUID, IsNumber, IsEnum, IsOptional, IsString } from 'class-validator';
import { AlmacenTipo } from '../../common/enums/almacen-tipo.enum';

export class CreateMovimientoAlmacenDto {
  @IsUUID()
  productoId: string;

  @IsUUID()
  loteId: string;

  @IsEnum(AlmacenTipo)
  almacenOrigen: AlmacenTipo;

  @IsEnum(AlmacenTipo)
  almacenDestino: AlmacenTipo;

  @IsNumber()
  cantidad: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}