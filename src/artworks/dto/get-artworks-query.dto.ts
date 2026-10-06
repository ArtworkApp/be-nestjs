import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetArtworksQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(21)
  limit = 21;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  artistId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  artworkTypeId?: number;

  @IsOptional()
  @IsString()
  materialIds?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  yearStart?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  yearEnd?: number;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsIn(['year_asc', 'year_desc', 'price_asc', 'price_desc'])
  sort?: string;
}
