import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetArtworkTypesQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  active?: boolean;
}
