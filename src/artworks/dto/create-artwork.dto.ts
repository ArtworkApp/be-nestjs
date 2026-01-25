import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ArtworkCategory } from '../../common/enums';

export class CreateArtworkDto {
  @ApiProperty({
    description: 'Artwork title',
    example: 'Sunset Over Mountains',
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Artwork description',
    example: 'A beautiful oil painting depicting a sunset over mountain ranges',
    required: false,
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    description: 'Artwork price',
    example: 299.99,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
    default: 'USD',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency?: string = 'USD';

  @ApiProperty({
    description: 'Artwork category',
    enum: ArtworkCategory,
    example: ArtworkCategory.PAINTING,
  })
  @IsEnum(ArtworkCategory)
  category: ArtworkCategory;

  @ApiProperty({
    description: 'Artwork medium',
    example: 'Oil on canvas',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  medium?: string;

  @ApiProperty({
    description: 'Artwork dimensions',
    example: '24" x 36"',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  dimensions?: string;

  @ApiProperty({
    description: 'Year the artwork was created',
    example: 2023,
    required: false,
    minimum: 1000,
    maximum: new Date().getFullYear(),
  })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(new Date().getFullYear())
  year?: number;

  @ApiProperty({
    description: 'Array of image URLs',
    example: [
      'https://example.com/artwork1.jpg',
      'https://example.com/artwork2.jpg',
    ],
    type: [String],
    minItems: 1,
    maxItems: 10,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  images: string[];

  @ApiProperty({
    description: 'Tags for the artwork',
    example: ['landscape', 'oil painting', 'mountains'],
    required: false,
    type: [String],
    maxItems: 20,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];
}
