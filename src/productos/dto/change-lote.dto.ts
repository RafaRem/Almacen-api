import { IsUUID, IsNotEmpty } from 'class-validator';

export class ChangeLoteDto {
  @IsUUID()
  @IsNotEmpty()
  loteId: string;
}