import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsUUID,
  IsInt,
  IsIn,
  ValidateIf,
} from 'class-validator';

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
  rfc?: string;

  @IsOptional()
  @IsUUID()
  categoriaClienteId?: string;

  @IsOptional()
  @IsIn(['fisica', 'moral'])
  tipoPersona?: TipoPersonaDto;

  @IsOptional()
  @IsString()
  empresa?: string;

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
  rfc?: string;

  @ValidateIf(
    (o) => o.categoriaClienteId !== null && o.categoriaClienteId !== undefined,
  )
  @IsUUID()
  categoriaClienteId?: string | null;

  @IsOptional()
  @IsIn(['fisica', 'moral'])
  tipoPersona?: TipoPersonaDto;

  @IsOptional()
  @IsString()
  empresa?: string;

  @IsOptional()
  @IsInt()
  statusId?: number;
}
