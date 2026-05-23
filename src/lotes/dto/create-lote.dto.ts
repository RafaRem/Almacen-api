import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsOptional,
  IsInt,
} from 'class-validator';

export class CreateLoteDto {
  @IsString()
  @IsNotEmpty()
  numeroLote: string;

  @IsDateString()
  @IsNotEmpty()
  fechaCaducidad: string;

  @IsUUID()
  @IsNotEmpty()
  laboratorioId: string;

  @IsOptional()
  @IsInt()
  statusId?: number;
}
