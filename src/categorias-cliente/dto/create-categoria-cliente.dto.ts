import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { StatusId } from '../../common/enums/status-id.enum';

export class CreateCategoriaClienteDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsNumber()
  @Min(2)
  @Max(5)
  descuento: number;
}

export class UpdateCategoriaClienteDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(5)
  descuento?: number;

  @IsOptional()
  @IsEnum(StatusId)
  statusId?: StatusId;
}
