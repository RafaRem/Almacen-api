import { IsArray, IsOptional, IsString, IsEnum } from 'class-validator';
import { UserModule } from '../../common/enums/user-module.enum';

export class UpdateUserPermissionsDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  modules?: UserModule[];
}
