import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { User } from 'generated/prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ access_token: string }> {
    const user = await this.usersService.findOneByEmail(dto.email);

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueToken(user);
  }

  async register(dto: RegisterDto): Promise<{ access_token: string }> {
    const [existingByUsername, existingByEmail] = await Promise.all([
      this.usersService.findOneByUsername(dto.username),
      this.usersService.findOneByEmail(dto.email),
    ]);

    if (existingByUsername) {
      throw new ConflictException('Username already exists');
    }
    if (existingByEmail) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      username: dto.username,
      email: dto.email,
      fullname: dto.fullname,
      password: hashedPassword,
      position: dto.position,
    });

    return this.issueToken(user);
  }

  logout(): { message: string } {
    return { message: 'Logged out successfully' };
  }

  private async issueToken(
    user: Pick<User, 'id' | 'username'>,
  ): Promise<{ access_token: string }> {
    const payload = { sub: user.id, username: user.username };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
