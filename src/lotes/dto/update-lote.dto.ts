import {
  IsString,
  IsUUID,
  IsDateString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { StatusId } from '../../common/enums/status-id.enum';

export class UpdateLoteDto {
  @IsOptional()
  @IsString()
  numeroLote?: string;

  @IsOptional()
  @IsDateString()
  fechaCaducidad?: string;

  @IsOptional()
  @IsUUID()
  laboratorioId?: string;

  @IsOptional()
  @IsEnum(StatusId)
  statusId?: StatusId;
}
