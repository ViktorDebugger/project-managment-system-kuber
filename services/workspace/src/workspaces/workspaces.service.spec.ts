jest.mock('generated/prisma/client', () => ({ PrismaClient: jest.fn() }));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceRepository } from './repositories/workspace.repository';

describe('WorkspacesService', () => {
  let service: WorkspacesService;
  let workspaceRepository: {
    findManyPaginatedByUserId: jest.Mock;
    countByUserId: jest.Mock;
    findUniqueById: jest.Mock;
    createWithTransaction: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    findParticipantByUserAndWorkspace: jest.Mock;
  };

  const mockWorkspace = {
    id: 'ws-1',
    name: 'Test Workspace',
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    workspaceRepository = {
      findManyPaginatedByUserId: jest.fn(),
      countByUserId: jest.fn(),
      findUniqueById: jest.fn(),
      createWithTransaction: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findParticipantByUserAndWorkspace: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        { provide: WorkspaceRepository, useValue: workspaceRepository },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn().mockResolvedValue(undefined),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
  });

  describe('findAll', () => {
    it('should return paginated workspaces', async () => {
      workspaceRepository.findManyPaginatedByUserId.mockResolvedValue([mockWorkspace]);
      workspaceRepository.countByUserId.mockResolvedValue(1);

      const result = await service.findAll(
        { page: 1, limit: 10 },
        'user-1',
      );

      expect(result.data).toEqual([mockWorkspace]);
      expect(result.meta).toMatchObject({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
      expect(workspaceRepository.findManyPaginatedByUserId).toHaveBeenCalled();
      expect(workspaceRepository.countByUserId).toHaveBeenCalledWith('user-1');
    });
  });

  describe('findOne', () => {
    it('should return workspace when found', async () => {
      workspaceRepository.findUniqueById.mockResolvedValue(mockWorkspace);

      const result = await service.findOne('ws-1');

      expect(result).toBe(mockWorkspace);
      expect(workspaceRepository.findUniqueById).toHaveBeenCalledWith('ws-1');
    });

    it('should throw NotFoundException when not found', async () => {
      workspaceRepository.findUniqueById.mockResolvedValue(null);

      await expect(service.findOne('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create workspace', async () => {
      workspaceRepository.createWithTransaction.mockResolvedValue(mockWorkspace);

      const result = await service.create(
        { name: 'New WS', description: 'Desc' },
        'user-1',
      );

      expect(result).toBe(mockWorkspace);
      expect(workspaceRepository.createWithTransaction).toHaveBeenCalledWith(
        { name: 'New WS', description: 'Desc' },
        'user-1',
      );
    });
  });

  describe('update', () => {
    it('should update workspace', async () => {
      workspaceRepository.findUniqueById.mockResolvedValue(mockWorkspace);
      workspaceRepository.update.mockResolvedValue({ ...mockWorkspace, name: 'Updated' });

      const result = await service.update('ws-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
      expect(workspaceRepository.update).toHaveBeenCalledWith(
        'ws-1',
        expect.objectContaining({ name: 'Updated' }),
      );
    });

    it('should throw NotFoundException when workspace not found', async () => {
      workspaceRepository.findUniqueById.mockResolvedValue(null);

      await expect(service.update('unknown', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete workspace and return true', async () => {
      workspaceRepository.findUniqueById.mockResolvedValue(mockWorkspace);
      workspaceRepository.delete.mockResolvedValue(undefined);

      const result = await service.remove('ws-1');

      expect(result).toBe(true);
      expect(workspaceRepository.delete).toHaveBeenCalledWith('ws-1');
    });

    it('should throw NotFoundException when workspace not found', async () => {
      workspaceRepository.findUniqueById.mockResolvedValue(null);

      await expect(service.remove('unknown')).rejects.toThrow(NotFoundException);
    });
  });
});
