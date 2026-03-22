jest.mock('generated/prisma/client', () => ({ PrismaClient: jest.fn() }));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SprintsService } from './sprints.service';
import { SprintRepository } from './repositories/sprint.repository';

describe('SprintsService', () => {
  let service: SprintsService;
  let sprintRepository: {
    findManyByProjectIdPaginated: jest.Mock;
    countByProjectId: jest.Mock;
    findFirstByIdAndProjectId: jest.Mock;
    findProjectByWorkspaceAndId: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    findTasksBySprintId: jest.Mock;
  };

  const mockSprint = {
    id: 'sprint-1',
    projectId: 'proj-1',
    name: 'Sprint 1',
    goal: null,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-14'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    sprintRepository = {
      findManyByProjectIdPaginated: jest.fn(),
      countByProjectId: jest.fn(),
      findFirstByIdAndProjectId: jest.fn(),
      findProjectByWorkspaceAndId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findTasksBySprintId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SprintsService,
        { provide: SprintRepository, useValue: sprintRepository },
      ],
    }).compile();

    service = module.get<SprintsService>(SprintsService);
  });

  describe('findAllByProjectId', () => {
    it('should return paginated sprints', async () => {
      sprintRepository.findProjectByWorkspaceAndId.mockResolvedValue({ id: 'proj-1' });
      sprintRepository.findManyByProjectIdPaginated.mockResolvedValue([mockSprint]);
      sprintRepository.countByProjectId.mockResolvedValue(1);

      const result = await service.findAllByProjectId('ws-1', 'proj-1', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual([mockSprint]);
      expect(result.meta.total).toBe(1);
    });

    it('should throw NotFoundException when project not in workspace', async () => {
      sprintRepository.findProjectByWorkspaceAndId.mockResolvedValue(null);

      await expect(
        service.findAllByProjectId('ws-1', 'proj-1', { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return sprint when found', async () => {
      sprintRepository.findFirstByIdAndProjectId.mockResolvedValue(mockSprint);
      sprintRepository.findProjectByWorkspaceAndId.mockResolvedValue({ id: 'proj-1' });

      const result = await service.findOne('ws-1', 'proj-1', 'sprint-1');

      expect(result).toBe(mockSprint);
    });

    it('should throw NotFoundException when sprint not found', async () => {
      sprintRepository.findFirstByIdAndProjectId.mockResolvedValue(null);

      await expect(service.findOne('ws-1', 'proj-1', 'unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create sprint', async () => {
      sprintRepository.findProjectByWorkspaceAndId.mockResolvedValue({ id: 'proj-1' });
      sprintRepository.create.mockResolvedValue(mockSprint);

      const result = await service.create('ws-1', 'proj-1', {
        name: 'Sprint 1',
        startDate: '2025-01-01',
        endDate: '2025-01-14',
      });

      expect(result).toBe(mockSprint);
      expect(sprintRepository.create).toHaveBeenCalledWith({
        projectId: 'proj-1',
        name: 'Sprint 1',
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      });
    });

    it('should throw NotFoundException when project not found', async () => {
      sprintRepository.findProjectByWorkspaceAndId.mockResolvedValue(null);

      await expect(
        service.create('ws-1', 'proj-1', {
          name: 'Sprint 1',
          startDate: '2025-01-01',
          endDate: '2025-01-14',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update sprint', async () => {
      sprintRepository.findFirstByIdAndProjectId.mockResolvedValue(mockSprint);
      sprintRepository.findProjectByWorkspaceAndId.mockResolvedValue({ id: 'proj-1' });
      sprintRepository.update.mockResolvedValue({ ...mockSprint, name: 'Updated' });

      const result = await service.update('ws-1', 'proj-1', 'sprint-1', {
        name: 'Updated',
      });

      expect(result.name).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should delete sprint and return true', async () => {
      sprintRepository.findFirstByIdAndProjectId.mockResolvedValue(mockSprint);
      sprintRepository.findProjectByWorkspaceAndId.mockResolvedValue({ id: 'proj-1' });
      sprintRepository.delete.mockResolvedValue(undefined);

      const result = await service.remove('ws-1', 'proj-1', 'sprint-1');

      expect(result).toBe(true);
      expect(sprintRepository.delete).toHaveBeenCalledWith('sprint-1');
    });
  });

  describe('findTasksBySprintId', () => {
    it('should return tasks for sprint', async () => {
      sprintRepository.findFirstByIdAndProjectId.mockResolvedValue(mockSprint);
      sprintRepository.findProjectByWorkspaceAndId.mockResolvedValue({ id: 'proj-1' });
      sprintRepository.findTasksBySprintId.mockResolvedValue([]);

      const result = await service.findTasksBySprintId('ws-1', 'proj-1', 'sprint-1');

      expect(result).toEqual([]);
      expect(sprintRepository.findTasksBySprintId).toHaveBeenCalledWith('sprint-1');
    });
  });
});
