import { IsString, IsNotEmpty, IsArray, IsEnum, IsOptional } from 'class-validator';

export class SendBroadcastDto {
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  recipients?: string[];

  @IsEnum(['all', 'manual'])
  @IsNotEmpty()
  recipientType: 'all' | 'manual';
}
