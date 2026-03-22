jest.mock('generated/prisma/client', () => ({ PrismaClient: jest.fn() }));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserRepository } from './repositories/user.repository';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: {
    findUniqueByUsername: jest.Mock;
    findUniqueById: jest.Mock;
    findUniqueByEmail: jest.Mock;
    countByIds: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };

  const mockUser = {
    id: 'usr-1',
    username: 'john',
    email: 'john@example.com',
    fullname: 'John Doe',
    password: 'hashed',
    position: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    userRepository = {
      findUniqueByUsername: jest.fn(),
      findUniqueById: jest.fn(),
      findUniqueByEmail: jest.fn(),
      countByIds: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UserRepository, useValue: userRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findOneByUsername', () => {
    it('should return user when found', async () => {
      userRepository.findUniqueByUsername.mockResolvedValue(mockUser);
      const result = await service.findOneByUsername('john');
      expect(result).toBe(mockUser);
      expect(userRepository.findUniqueByUsername).toHaveBeenCalledWith('john');
    });

    it('should return null when not found', async () => {
      userRepository.findUniqueByUsername.mockResolvedValue(null);
      const result = await service.findOneByUsername('unknown');
      expect(result).toBeNull();
    });
  });

  describe('findOneById', () => {
    it('should return user when found', async () => {
      userRepository.findUniqueById.mockResolvedValue(mockUser);
      const result = await service.findOneById('usr-1');
      expect(result).toBe(mockUser);
    });

    it('should return null when not found', async () => {
      userRepository.findUniqueById.mockResolvedValue(null);
      const result = await service.findOneById('unknown');
      expect(result).toBeNull();
    });
  });

  describe('findOneByEmail', () => {
    it('should return user when found', async () => {
      userRepository.findUniqueByEmail.mockResolvedValue(mockUser);
      const result = await service.findOneByEmail('john@example.com');
      expect(result).toBe(mockUser);
    });

    it('should return null when not found', async () => {
      userRepository.findUniqueByEmail.mockResolvedValue(null);
      const result = await service.findOneByEmail('unknown@example.com');
      expect(result).toBeNull();
    });
  });

  describe('validateUserIds', () => {
    it('should return false when ids empty', async () => {
      const result = await service.validateUserIds([]);
      expect(result).toBe(false);
      expect(userRepository.countByIds).not.toHaveBeenCalled();
    });

    it('should return true when all ids valid', async () => {
      userRepository.countByIds.mockResolvedValue(2);
      const result = await service.validateUserIds(['id1', 'id2']);
      expect(result).toBe(true);
      expect(userRepository.countByIds).toHaveBeenCalledWith(['id1', 'id2']);
    });

    it('should return false when count mismatch', async () => {
      userRepository.countByIds.mockResolvedValue(1);
      const result = await service.validateUserIds(['id1', 'id2']);
      expect(result).toBe(false);
    });
  });

  describe('getProfile', () => {
    it('should return user without password when found', async () => {
      userRepository.findUniqueById.mockResolvedValue(mockUser);
      const result = await service.getProfile('usr-1');
      expect(result).not.toBeNull();
      expect('password' in (result ?? {})).toBe(false);
      expect(result?.username).toBe('john');
    });

    it('should return null when not found', async () => {
      userRepository.findUniqueById.mockResolvedValue(null);
      const result = await service.getProfile('unknown');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create user without position when not provided', async () => {
      userRepository.create.mockResolvedValue(mockUser);
      const result = await service.create({
        username: 'john',
        email: 'john@example.com',
        fullname: 'John Doe',
        password: 'pass',
      });
      expect(result).toBe(mockUser);
      expect(userRepository.create).toHaveBeenCalledWith({
        username: 'john',
        email: 'john@example.com',
        fullname: 'John Doe',
        password: 'pass',
      });
    });

    it('should include position when provided and non-empty', async () => {
      userRepository.create.mockResolvedValue({ ...mockUser, position: 'Dev' });
      await service.create({
        username: 'john',
        email: 'john@example.com',
        fullname: 'John Doe',
        password: 'pass',
        position: 'Dev',
      });
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ position: 'Dev' }),
      );
    });

    it('should omit position when empty string', async () => {
      await service.create({
        username: 'john',
        email: 'john@example.com',
        fullname: 'John Doe',
        password: 'pass',
        position: '',
      });
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.not.objectContaining({ position: expect.anything() }),
      );
    });
  });

  describe('updateProfile', () => {
    it('should throw NotFoundException when user not found', async () => {
      userRepository.findUniqueById.mockResolvedValue(null);

      await expect(
        service.updateProfile('unknown', { fullname: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return user as-is when no updates', async () => {
      const { password: _, ...rest } = mockUser;
      userRepository.findUniqueById.mockResolvedValue(mockUser);

      const result = await service.updateProfile('usr-1', {});

      expect(result).toEqual(rest);
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when new email already in use', async () => {
      userRepository.findUniqueById.mockResolvedValue(mockUser);
      userRepository.findUniqueByEmail.mockResolvedValue({
        id: 'other',
        email: 'taken@example.com',
      });

      await expect(
        service.updateProfile('usr-1', { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should update and return user without password', async () => {
      const updatedUser = { ...mockUser, fullname: 'Updated', password: 'new-hashed' };
      userRepository.findUniqueById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('usr-1', {
        fullname: 'Updated',
        newPassword: 'newpass',
      });

      expect('password' in result).toBe(false);
      expect(result.fullname).toBe('Updated');
      expect(bcrypt.hash).toHaveBeenCalledWith('newpass', 10);
      expect(userRepository.update).toHaveBeenCalledWith(
        'usr-1',
        expect.objectContaining({ fullname: 'Updated', password: 'new-hashed' }),
      );
    });
  });
});
