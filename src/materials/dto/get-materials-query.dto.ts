import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetMaterialsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  artworkTypeId?: number;

  @IsOptional()
  @IsString()
  search?: string;
}
