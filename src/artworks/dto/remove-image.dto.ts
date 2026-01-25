import { ApiProperty } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';

export class RemoveImageDto {
  @ApiProperty({
    description: 'Image URL to remove',
    example: 'https://example.com/image-to-remove.jpg',
  })
  @IsUrl()
  imageUrl: string;
}
