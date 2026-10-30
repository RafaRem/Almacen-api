import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Clase } from '../../common/enums/clase.enum';

type TipoPersonaDto = 'fisica' | 'moral';

export class ClienteBasicoFullDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsString()
  apellidoPaterno?: string | null;

  @IsOptional()
  @IsString()
  apellidoMaterno?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  rfc?: string | null;

  @IsOptional()
  @IsUUID()
  categoriaClienteId?: string | null;

  @IsOptional()
  @IsIn(['fisica', 'moral'])
  tipoPersona?: TipoPersonaDto;

  @IsOptional()
  @IsString()
  empresa?: string | null;

  @IsOptional()
  @IsInt()
  statusId?: number;

  @IsOptional()
  @IsIn(['A', 'B'])
  clase?: Clase;
}

export class ClienteCreateBasicoFullDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  apellidoPaterno?: string | null;

  @IsOptional()
  @IsString()
  apellidoMaterno?: string | null;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  rfc?: string | null;

  @IsOptional()
  @IsUUID()
  categoriaClienteId?: string | null;

  @IsOptional()
  @IsIn(['fisica', 'moral'])
  tipoPersona?: TipoPersonaDto;

  @IsOptional()
  @IsString()
  empresa?: string | null;

  @IsOptional()
  @IsInt()
  statusId?: number;

  @IsOptional()
  @IsIn(['A', 'B'])
  clase?: Clase;
}

export class DomicilioFullDto {
  @IsString()
  @IsNotEmpty()
  calle: string;

  @IsString()
  @IsNotEmpty()
  numeroExt: string;

  @IsOptional()
  @IsString()
  numeroInt?: string | null;

  @IsString()
  @IsNotEmpty()
  localidad: string;

  @IsString()
  @IsNotEmpty()
  ciudad: string;

  @IsString()
  @IsNotEmpty()
  codigoPostal: string;

  @IsOptional()
  @IsString()
  municipio?: string | null;

  @IsOptional()
  @IsString()
  estado?: string | null;

  @IsOptional()
  @IsString()
  pais?: string;

  @IsOptional()
  @IsInt()
  statusId?: number;
}

export class FacturacionFullDto {
  @IsString()
  @IsNotEmpty()
  rfc: string;

  @IsString()
  @IsNotEmpty()
  razonSocial: string;

  @IsOptional()
  @IsEmail()
  correo?: string | null;

  @IsInt()
  regimenFiscalId: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  usoCfdi?: string;

  @IsOptional()
  @IsInt()
  statusId?: number;
}

export class TelefonoFullDto {
  @IsIn(['telefono', 'celular'])
  tipo: 'telefono' | 'celular';

  @Matches(/^\d{10}$/, {
    message: 'El teléfono debe tener exactamente 10 dígitos',
  })
  numero: string;

  @IsOptional()
  @IsInt()
  statusId?: number;
}

export class CreditoFullDto {
  @IsNumber()
  limite: number;

  @IsOptional()
  @IsNumber()
  saldoActual?: number;

  @IsOptional()
  @IsNumber()
  creditoAFavor?: number;

  @IsOptional()
  @IsInt()
  idStatus?: number;

  @IsOptional()
  @IsInt()
  fechaDeCorte?: number;
}

export class UpdateClienteFullDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ClienteBasicoFullDto)
  cliente?: ClienteBasicoFullDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DomicilioFullDto)
  domicilio?: DomicilioFullDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => FacturacionFullDto)
  facturacion?: FacturacionFullDto | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TelefonoFullDto)
  telefonos?: TelefonoFullDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CreditoFullDto)
  credito?: CreditoFullDto | null;
}

export class CreateClienteFullDto {
  @ValidateNested()
  @Type(() => ClienteCreateBasicoFullDto)
  cliente: ClienteCreateBasicoFullDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DomicilioFullDto)
  domicilio?: DomicilioFullDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => FacturacionFullDto)
  facturacion?: FacturacionFullDto | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TelefonoFullDto)
  telefonos?: TelefonoFullDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CreditoFullDto)
  credito?: CreditoFullDto | null;
}
