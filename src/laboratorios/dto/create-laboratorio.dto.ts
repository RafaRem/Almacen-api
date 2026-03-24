import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateLaboratorioDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}