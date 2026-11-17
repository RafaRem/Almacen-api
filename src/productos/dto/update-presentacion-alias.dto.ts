import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PresentacionAliasDto {
  @IsUUID()
  id: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  alias?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  codigoBarras?: string | null;
}

export class UpdatePresentacionAliasDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PresentacionAliasDto)
  presentaciones: PresentacionAliasDto[];
}
