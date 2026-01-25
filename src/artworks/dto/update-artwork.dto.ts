import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateArtworkDto } from './create-artwork.dto';

export class UpdateArtworkDto extends PartialType(
  OmitType(CreateArtworkDto, [] as const),
) {}
