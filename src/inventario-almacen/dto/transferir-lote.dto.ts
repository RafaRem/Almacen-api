import {
  IsUUID,
  IsNumber,
  IsEnum,
  IsString,
  IsNotEmpty,
  Min,
  IsIn,
  IsDateString,
  ValidateIf,
} from 'class-validator';
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

  @ValidateIf((o) => o.tipoDestino === 'existente')
  @IsUUID()
  loteDestinoId?: string;

  @ValidateIf((o) => o.tipoDestino === 'nuevo')
  @IsString()
  @IsNotEmpty()
  nuevoNumeroLote?: string;

  @ValidateIf((o) => o.tipoDestino === 'nuevo')
  @IsDateString()
  nuevaFechaCaducidad?: string;
}
