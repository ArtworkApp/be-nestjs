import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUrl } from 'class-validator';

export class AddImagesDto {
  @ApiProperty({
    description: 'Array of new image URLs to add',
    example: [
      'https://example.com/new-image1.jpg',
      'https://example.com/new-image2.jpg',
    ],
    type: [String],
    minItems: 1,
    maxItems: 5,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsUrl({}, { each: true })
  images: string[];
}
