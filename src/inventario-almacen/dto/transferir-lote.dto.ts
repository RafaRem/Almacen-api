import { IsUUID, IsNumber, IsEnum, IsString, IsOptional, Min, IsIn, IsDateString } from 'class-validator';
import { AlmacenTipo } from '../../common/enums/almacen-tipo.enum';

export class TransferirLoteDto {
  @IsUUID()
  productoId: string;

  @IsUUID()
  loteOrigenId: string;

  @IsNumber()
  @Min(0.01)
  cantidad: number;

  @IsEnum(AlmacenTipo)
  almacenTipo: AlmacenTipo;

  @IsString()
  @IsIn(['existente', 'nuevo'])
  tipoDestino: string;

  @IsOptional()
  @IsUUID()
  loteDestinoId?: string;

  @IsOptional()
  @IsString()
  nuevoNumeroLote?: string;

  @IsOptional()
  @IsDateString()
  nuevaFechaCaducidad?: string;
}
