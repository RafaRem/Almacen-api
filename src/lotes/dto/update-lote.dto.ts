import { IsString, IsNumber, IsUUID, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { StatusId } from '../../common/enums/status-id.enum';

export class UpdateLoteDto {
  @IsOptional()
  @IsString()
  numeroLote?: string;

  @IsOptional()
  @IsNumber()
  precio?: number;

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