import { IsString, IsOptional, IsEnum } from 'class-validator';
import { StatusId } from '../../common/enums/status-id.enum';

export class UpdateLaboratorioDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(StatusId)
  statusId?: StatusId;
}
