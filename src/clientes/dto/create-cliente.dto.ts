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
import { Clase } from '../../common/enums/clase.enum';

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

  @IsOptional()
  @IsIn(['A', 'B'])
  clase?: Clase;
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

  @IsOptional()
  @IsIn(['A', 'B'])
  clase?: Clase;
}
