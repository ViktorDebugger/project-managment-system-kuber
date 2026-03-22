import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Put,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiBearerAuth()
  @Get()
  async getProfile(@Request() req: { user?: { sub?: string } }) {
    const profile = await this.usersService.getProfile(req.user?.sub ?? '');
    if (!profile) {
      throw new NotFoundException('User not found');
    }
    return profile;
  }

  @ApiBearerAuth()
  @Put('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Request() req: { user?: { sub?: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new NotFoundException('User not found');
    }
    return this.usersService.updateProfile(userId, {
      fullname: dto.fullname,
      position: dto.position,
      email: dto.email,
      newPassword: dto.newPassword,
    });
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout() {
    return this.authService.logout();
  }
}
