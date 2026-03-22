jest.mock('generated/prisma/client', () => ({ PrismaClient: jest.fn() }));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findOneByEmail: jest.Mock; findOneByUsername: jest.Mock; create: jest.Mock };
  let jwtService: { signAsync: jest.Mock };

  const mockUser = {
    id: 'usr-1',
    username: 'john',
    email: 'john@example.com',
    fullname: 'John Doe',
    password: '$2b$10$hashed',
    position: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    usersService = {
      findOneByEmail: jest.fn(),
      findOneByUsername: jest.fn(),
      create: jest.fn(),
    };
    jwtService = { signAsync: jest.fn().mockResolvedValue('jwt-token') };
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashed');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should return access_token on valid credentials', async () => {
      usersService.findOneByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'john@example.com',
        password: 'password123',
      });

      expect(result).toEqual({ access_token: 'jwt-token' });
      expect(usersService.findOneByEmail).toHaveBeenCalledWith('john@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockUser.password);
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        username: mockUser.username,
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      usersService.findOneByEmail.mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockClear();

      await expect(
        service.login({ email: 'unknown@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password invalid', async () => {
      usersService.findOneByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'john@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should return access_token on successful registration', async () => {
      usersService.findOneByUsername.mockResolvedValue(null);
      usersService.findOneByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);

      const result = await service.register({
        username: 'john',
        email: 'john@example.com',
        fullname: 'John Doe',
        password: 'password123',
      });

      expect(result).toEqual({ access_token: 'jwt-token' });
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'john',
          email: 'john@example.com',
          fullname: 'John Doe',
          position: undefined,
        }),
      );
      expect(usersService.create.mock.calls[0][0].password).not.toBe('password123');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });

    it('should throw ConflictException when username exists', async () => {
      usersService.findOneByUsername.mockResolvedValue(mockUser);
      usersService.findOneByEmail.mockResolvedValue(null);

      await expect(
        service.register({
          username: 'john',
          email: 'new@example.com',
          fullname: 'New User',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when email exists', async () => {
      usersService.findOneByUsername.mockResolvedValue(null);
      usersService.findOneByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({
          username: 'newuser',
          email: 'john@example.com',
          fullname: 'New User',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should return success message', () => {
      const result = service.logout();
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
