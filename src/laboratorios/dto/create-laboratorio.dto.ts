import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class CreateLaboratorioDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  rfc?: string;

  @IsOptional()
  @IsInt()
  statusId?: number;
}