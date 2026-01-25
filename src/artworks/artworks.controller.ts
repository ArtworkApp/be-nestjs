import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ArtworkCategory, ListingStatus } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { ArtworksService } from './artworks.service';
import { AddImagesDto } from './dto/add-images.dto';
import { ArtworkSearchDto } from './dto/artwork-search.dto';
import { CreateArtworkDto } from './dto/create-artwork.dto';
import { RemoveImageDto } from './dto/remove-image.dto';
import { UpdateArtworkDto } from './dto/update-artwork.dto';
import { Artwork } from './entities/artwork.entity';

@ApiTags('artworks')
@Controller('artworks')
export class ArtworksController {
  constructor(private readonly artworksService: ArtworksService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new artwork listing' })
  @ApiResponse({
    status: 201,
    description: 'Artwork created successfully',
    type: Artwork,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid artwork data',
  })
  async create(
    @CurrentUser() user: User,
    @Body() createArtworkDto: CreateArtworkDto,
  ): Promise<Artwork> {
    return this.artworksService.create(user.id, createArtworkDto);
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search artworks' })
  @ApiResponse({
    status: 200,
    description: 'Artworks retrieved successfully',
  })
  async search(@Query() searchDto: ArtworkSearchDto) {
    return this.artworksService.search(searchDto);
  }

  @Get('featured')
  @Public()
  @ApiOperation({ summary: 'Get featured artworks' })
  @ApiQuery({
    name: 'limit',
    description: 'Number of artworks to return',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Featured artworks retrieved successfully',
    type: [Artwork],
  })
  async getFeatured(@Query('limit') limit = 10): Promise<Artwork[]> {
    return this.artworksService.getFeatured(limit);
  }

  @Get('recent')
  @Public()
  @ApiOperation({ summary: 'Get recent artworks' })
  @ApiQuery({
    name: 'limit',
    description: 'Number of artworks to return',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Recent artworks retrieved successfully',
    type: [Artwork],
  })
  async getRecent(@Query('limit') limit = 10): Promise<Artwork[]> {
    return this.artworksService.getRecent(limit);
  }

  @Get('categories/:category')
  @Public()
  @ApiOperation({ summary: 'Get artworks by category' })
  @ApiParam({
    name: 'category',
    description: 'Artwork category',
    enum: ArtworkCategory,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of artworks to return',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Artworks by category retrieved successfully',
    type: [Artwork],
  })
  async getByCategory(
    @Param('category', new ParseEnumPipe(ArtworkCategory))
    category: ArtworkCategory,
    @Query('limit') limit = 10,
  ): Promise<Artwork[]> {
    return this.artworksService.getByCategory(category, limit);
  }

  @Get('categories/stats')
  @Public()
  @ApiOperation({ summary: 'Get category statistics' })
  @ApiResponse({
    status: 200,
    description: 'Category statistics retrieved successfully',
  })
  async getCategoryStats() {
    return this.artworksService.getCategoryStats();
  }

  @Get('seller/:sellerId')
  @Public()
  @ApiOperation({ summary: 'Get artworks by seller' })
  @ApiParam({
    name: 'sellerId',
    description: 'Seller ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Items per page',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Seller artworks retrieved successfully',
  })
  async getBySeller(
    @Param('sellerId', ParseUUIDPipe) sellerId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 12,
  ) {
    return this.artworksService.findBySeller(sellerId, page, limit);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get artwork by ID' })
  @ApiParam({
    name: 'id',
    description: 'Artwork ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Artwork retrieved successfully',
    type: Artwork,
  })
  @ApiResponse({
    status: 404,
    description: 'Artwork not found',
  })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Artwork> {
    return this.artworksService.findByIdAndIncrementViews(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update artwork' })
  @ApiParam({
    name: 'id',
    description: 'Artwork ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Artwork updated successfully',
    type: Artwork,
  })
  @ApiResponse({
    status: 403,
    description: 'You can only update your own artworks',
  })
  @ApiResponse({
    status: 404,
    description: 'Artwork not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() updateArtworkDto: UpdateArtworkDto,
  ): Promise<Artwork> {
    return this.artworksService.update(id, user.id, updateArtworkDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete artwork' })
  @ApiParam({
    name: 'id',
    description: 'Artwork ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Artwork deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'You can only delete your own artworks',
  })
  @ApiResponse({
    status: 404,
    description: 'Artwork not found',
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.artworksService.delete(id, user.id);
    return {
      message: 'Artwork deleted successfully',
    };
  }

  @Put(':id/status/:status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update artwork status' })
  @ApiParam({
    name: 'id',
    description: 'Artwork ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'status',
    description: 'New status',
    enum: ListingStatus,
  })
  @ApiResponse({
    status: 200,
    description: 'Artwork status updated successfully',
    type: Artwork,
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('status', new ParseEnumPipe(ListingStatus)) status: ListingStatus,
    @CurrentUser() user: User,
  ): Promise<Artwork> {
    return this.artworksService.updateStatus(id, user.id, status);
  }

  @Put(':id/images')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add images to artwork' })
  @ApiParam({
    name: 'id',
    description: 'Artwork ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Images added successfully',
    type: Artwork,
  })
  async addImages(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() addImagesDto: AddImagesDto,
  ): Promise<Artwork> {
    return this.artworksService.addImages(id, user.id, addImagesDto.images);
  }

  @Delete(':id/images')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove image from artwork' })
  @ApiParam({
    name: 'id',
    description: 'Artwork ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Image removed successfully',
    type: Artwork,
  })
  async removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() removeImageDto: RemoveImageDto,
  ): Promise<Artwork> {
    return this.artworksService.removeImage(
      id,
      user.id,
      removeImageDto.imageUrl,
    );
  }

  @Post(':id/images/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 5))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload images for artwork' })
  @ApiParam({
    name: 'id',
    description: 'Artwork ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Images uploaded successfully',
    type: Artwork,
  })
  async uploadImages(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<Artwork> {
    if (!files || files.length === 0) {
      throw new Error('No files provided');
    }

    // TODO: Implement actual file upload to S3 or similar service
    // For now, we'll just use placeholder URLs
    const imageUrls = files.map(
      (file, index) =>
        `https://placeholder.com/artwork-images/${id}/${index}-${file.originalname}`,
    );

    return this.artworksService.addImages(id, user.id, imageUrls);
  }

  @Put(':id/toggle-featured')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle artwork featured status (Admin only)' })
  @ApiParam({
    name: 'id',
    description: 'Artwork ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Featured status toggled successfully',
    type: Artwork,
  })
  async toggleFeatured(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Artwork> {
    // TODO: Add admin role check
    return this.artworksService.toggleFeatured(id);
  }
}
