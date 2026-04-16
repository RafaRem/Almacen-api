import { IsString, IsNotEmpty, IsNumber, IsUUID, IsDateString, IsOptional, IsInt } from 'class-validator';

export class CreateLoteDto {
  @IsString()
  @IsNotEmpty()
  numeroLote: string;

  @IsNumber()
  @IsNotEmpty()
  precio: number;

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