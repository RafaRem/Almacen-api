import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { UserTipo, UserStatusId } from '../entities/user.entity';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  provisionalPassword?: string;

  @IsOptional()
  @IsEnum(UserTipo)
  tipo?: UserTipo;

  @IsOptional()
  @IsEnum(UserStatusId)
  statusId?: UserStatusId;
}
