jest.mock('generated/prisma/client', () => ({ PrismaClient: jest.fn() }));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ParticipantsService } from './participants.service';
import { ParticipantRepository } from './repositories/participant.repository';
import { UserClientService } from '../users/user-client.service';

describe('ParticipantsService', () => {
  let service: ParticipantsService;
  let participantRepository: {
    findManyByWorkspaceIdPaginated: jest.Mock;
    countByWorkspaceId: jest.Mock;
    findFirstByIdAndWorkspaceId: jest.Mock;
    findUniqueByUserIdAndWorkspaceId: jest.Mock;
    findWorkspaceById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let userClientService: { validateUserIds: jest.Mock };

  const mockParticipant = {
    id: 'p-1',
    userId: 'user-1',
    workspaceId: 'ws-1',
    role: 'Member',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    participantRepository = {
      findManyByWorkspaceIdPaginated: jest.fn(),
      countByWorkspaceId: jest.fn(),
      findFirstByIdAndWorkspaceId: jest.fn(),
      findUniqueByUserIdAndWorkspaceId: jest.fn(),
      findWorkspaceById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    userClientService = { validateUserIds: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParticipantsService,
        { provide: ParticipantRepository, useValue: participantRepository },
        { provide: UserClientService, useValue: userClientService },
      ],
    }).compile();

    service = module.get<ParticipantsService>(ParticipantsService);
  });

  describe('findAllByWorkspaceId', () => {
    it('should return paginated participants', async () => {
      participantRepository.findWorkspaceById.mockResolvedValue({ id: 'ws-1' });
      participantRepository.findManyByWorkspaceIdPaginated.mockResolvedValue([mockParticipant]);
      participantRepository.countByWorkspaceId.mockResolvedValue(1);

      const result = await service.findAllByWorkspaceId('ws-1', { page: 1, limit: 10 });

      expect(result.data).toEqual([mockParticipant]);
      expect(result.meta.total).toBe(1);
    });

    it('should throw NotFoundException when workspace not found', async () => {
      participantRepository.findWorkspaceById.mockResolvedValue(null);

      await expect(
        service.findAllByWorkspaceId('unknown', { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return participant when found', async () => {
      participantRepository.findFirstByIdAndWorkspaceId.mockResolvedValue(mockParticipant);

      const result = await service.findOne('ws-1', 'p-1');

      expect(result).toBe(mockParticipant);
    });

    it('should throw NotFoundException when not found', async () => {
      participantRepository.findFirstByIdAndWorkspaceId.mockResolvedValue(null);

      await expect(service.findOne('ws-1', 'unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create participant on success', async () => {
      participantRepository.findWorkspaceById.mockResolvedValue({ id: 'ws-1' });
      userClientService.validateUserIds.mockResolvedValue(true);
      participantRepository.findUniqueByUserIdAndWorkspaceId.mockResolvedValue(null);
      participantRepository.create.mockResolvedValue(mockParticipant);

      const result = await service.create('ws-1', {
        userId: 'user-1',
        role: 'Member',
      });

      expect(result).toBe(mockParticipant);
      expect(userClientService.validateUserIds).toHaveBeenCalledWith(['user-1']);
      expect(participantRepository.create).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: 'Member',
      });
    });

    it('should throw NotFoundException when user invalid', async () => {
      participantRepository.findWorkspaceById.mockResolvedValue({ id: 'ws-1' });
      userClientService.validateUserIds.mockResolvedValue(false);

      await expect(
        service.create('ws-1', { userId: 'invalid-user', role: 'Member' }),
      ).rejects.toThrow(NotFoundException);
      expect(participantRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when user already participant', async () => {
      participantRepository.findWorkspaceById.mockResolvedValue({ id: 'ws-1' });
      userClientService.validateUserIds.mockResolvedValue(true);
      participantRepository.findUniqueByUserIdAndWorkspaceId.mockResolvedValue(mockParticipant);

      await expect(
        service.create('ws-1', { userId: 'user-1', role: 'Member' }),
      ).rejects.toThrow(ConflictException);
      expect(participantRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update participant', async () => {
      participantRepository.findFirstByIdAndWorkspaceId.mockResolvedValue(mockParticipant);
      participantRepository.update.mockResolvedValue({ ...mockParticipant, role: 'Admin' });

      const result = await service.update('ws-1', 'p-1', { role: 'Admin' });

      expect(result.role).toBe('Admin');
      expect(participantRepository.update).toHaveBeenCalledWith(
        'p-1',
        expect.objectContaining({ role: 'Admin' }),
      );
    });
  });

  describe('remove', () => {
    it('should delete participant and return true', async () => {
      participantRepository.findFirstByIdAndWorkspaceId.mockResolvedValue(mockParticipant);
      participantRepository.delete.mockResolvedValue(undefined);

      const result = await service.remove('ws-1', 'p-1');

      expect(result).toBe(true);
      expect(participantRepository.delete).toHaveBeenCalledWith('p-1');
    });
  });
});
