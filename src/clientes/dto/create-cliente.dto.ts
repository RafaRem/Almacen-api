import { IsString, IsNotEmpty, IsOptional, IsEmail, IsUUID, IsInt, IsIn } from 'class-validator';

type TipoPersonaDto = 'fisica' | 'moral';

export class CreateClienteDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  apellidoPaterno?: string;

  @IsOptional()
  @IsString()
  apellidoMaterno?: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  rfc?: string;

  @IsOptional()
  @IsUUID()
  categoriaClienteId?: string;

  @IsOptional()
  @IsIn(['fisica', 'moral'])
  tipoPersona?: TipoPersonaDto;

  @IsOptional()
  @IsInt()
  statusId?: number;
}

export class UpdateClienteDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  apellidoPaterno?: string;

  @IsOptional()
  @IsString()
  apellidoMaterno?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  rfc?: string;

  @IsOptional()
  @IsUUID()
  categoriaClienteId?: string;

  @IsOptional()
  @IsIn(['fisica', 'moral'])
  tipoPersona?: TipoPersonaDto;

  @IsOptional()
  @IsInt()
  statusId?: number;
}
