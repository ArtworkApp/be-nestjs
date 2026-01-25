import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UserDashboardDto } from './dto/user-dashboard.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { UserStatsDto } from './dto/user-stats.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/dashboard')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user dashboard' })
  @ApiResponse({
    status: 200,
    description: 'User dashboard retrieved successfully',
    type: UserDashboardDto,
  })
  async getDashboard(@CurrentUser() user: User): Promise<UserDashboardDto> {
    return this.usersService.getUserDashboard(user.id);
  }

  @Get('me/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user statistics' })
  @ApiResponse({
    status: 200,
    description: 'User statistics retrieved successfully',
    type: UserStatsDto,
  })
  async getMyStats(@CurrentUser() user: User): Promise<UserStatsDto> {
    return this.usersService.getUserStats(user.id);
  }

  @Put('me/profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: User,
  })
  @ApiResponse({
    status: 409,
    description: 'Username is already taken',
  })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateUserProfileDto: UpdateUserProfileDto,
  ): Promise<User> {
    return this.usersService.updateProfile(user.id, updateUserProfileDto);
  }

  @Put('me/profile-image')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload profile image' })
  @ApiResponse({
    status: 200,
    description: 'Profile image uploaded successfully',
    type: User,
  })
  async uploadProfileImage(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<User> {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    // TODO: Implement actual file upload to S3 or similar service
    // For now, we'll just use a placeholder URL
    const imageUrl = `https://placeholder.com/profile-images/${user.id}/${file.originalname}`;

    return this.usersService.uploadProfileImage(user.id, imageUrl);
  }

  @Delete('me/profile-image')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove profile image' })
  @ApiResponse({
    status: 200,
    description: 'Profile image removed successfully',
    type: User,
  })
  async removeProfileImage(@CurrentUser() user: User): Promise<User> {
    return this.usersService.removeProfileImage(user.id);
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search users' })
  @ApiQuery({
    name: 'q',
    description: 'Search query',
    required: false,
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
    description: 'Users retrieved successfully',
  })
  async searchUsers(
    @Query('q') query = '',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const skip = (page - 1) * limit;
    const [users, total] = await this.usersService.searchUsers(
      query,
      skip,
      limit,
    );

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get user profile by ID' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUserProfile(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserProfileDto> {
    return this.usersService.getUserProfile(id);
  }

  @Get(':id/stats')
  @Public()
  @ApiOperation({ summary: 'Get user statistics by ID' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'User statistics retrieved successfully',
    type: UserStatsDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUserStats(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserStatsDto> {
    return this.usersService.getUserStats(id);
  }

  @Get('username/:username')
  @Public()
  @ApiOperation({ summary: 'Get user profile by username' })
  @ApiParam({
    name: 'username',
    description: 'Username',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUserByUsername(
    @Param('username') username: string,
  ): Promise<UserProfileDto> {
    const user = await this.usersService.findByUsername(username);
    return this.usersService.getUserProfile(user.id);
  }

  @Put('me/deactivate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate current user account' })
  @ApiResponse({
    status: 200,
    description: 'Account deactivated successfully',
  })
  async deactivateAccount(@CurrentUser() user: User) {
    await this.usersService.deactivateUser(user.id);
    return {
      message: 'Account deactivated successfully',
    };
  }

  @Put('me/reactivate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivate current user account' })
  @ApiResponse({
    status: 200,
    description: 'Account reactivated successfully',
  })
  async reactivateAccount(@CurrentUser() user: User) {
    await this.usersService.reactivateUser(user.id);
    return {
      message: 'Account reactivated successfully',
    };
  }
}
