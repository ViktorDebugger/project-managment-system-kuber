jest.mock('generated/prisma/client', () => ({ PrismaClient: jest.fn() }));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TaskRepository } from './repositories/task.repository';
import { UserClientService } from '../clients/user-client.service';
import { WorkspaceClientService } from '../clients/workspace-client.service';

describe('TasksService', () => {
  let service: TasksService;
  let taskRepository: {
    findManyByProjectIdPaginated: jest.Mock;
    countByProjectId: jest.Mock;
    findFirstByIdAndProjectId: jest.Mock;
    findProjectByWorkspaceAndId: jest.Mock;
    createWithTransaction: jest.Mock;
    updateWithTransaction: jest.Mock;
    delete: jest.Mock;
  };
  let userClientService: { validateUserIds: jest.Mock };
  let workspaceClientService: {
    ensureWorkspaceExists: jest.Mock;
    resolveOrCreateTags: jest.Mock;
  };

  const mockTask = {
    id: 'task-1',
    projectId: 'proj-1',
    title: 'Test Task',
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    deadline: null,
    tagIds: [],
    assigneeIds: [],
    sprintId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    taskRepository = {
      findManyByProjectIdPaginated: jest.fn(),
      countByProjectId: jest.fn(),
      findFirstByIdAndProjectId: jest.fn(),
      findProjectByWorkspaceAndId: jest.fn(),
      createWithTransaction: jest.fn(),
      updateWithTransaction: jest.fn(),
      delete: jest.fn(),
    };
    userClientService = { validateUserIds: jest.fn().mockResolvedValue(true) };
    workspaceClientService = {
      ensureWorkspaceExists: jest.fn(),
      resolveOrCreateTags: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: TaskRepository, useValue: taskRepository },
        { provide: UserClientService, useValue: userClientService },
        { provide: WorkspaceClientService, useValue: workspaceClientService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe('findAllByProjectId', () => {
    it('should return paginated tasks', async () => {
      taskRepository.findProjectByWorkspaceAndId.mockResolvedValue({ id: 'proj-1' });
      taskRepository.findManyByProjectIdPaginated.mockResolvedValue([mockTask]);
      taskRepository.countByProjectId.mockResolvedValue(1);

      const result = await service.findAllByProjectId('ws-1', 'proj-1', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual([mockTask]);
      expect(result.meta.total).toBe(1);
    });

    it('should throw NotFoundException when project not in workspace', async () => {
      taskRepository.findProjectByWorkspaceAndId.mockResolvedValue(null);

      await expect(
        service.findAllByProjectId('ws-1', 'proj-1', { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return task when found', async () => {
      taskRepository.findFirstByIdAndProjectId.mockResolvedValue(mockTask);
      taskRepository.findProjectByWorkspaceAndId.mockResolvedValue({ id: 'proj-1' });

      const result = await service.findOne('ws-1', 'proj-1', 'task-1');

      expect(result).toBe(mockTask);
    });

    it('should throw NotFoundException when task not found', async () => {
      taskRepository.findFirstByIdAndProjectId.mockResolvedValue(null);

      await expect(service.findOne('ws-1', 'proj-1', 'unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create task on success', async () => {
      taskRepository.findProjectByWorkspaceAndId.mockResolvedValue({ id: 'proj-1' });
      taskRepository.createWithTransaction.mockResolvedValue(mockTask);

      const result = await service.create('ws-1', 'proj-1', {
        title: 'New Task',
      });

      expect(result).toBe(mockTask);
      expect(taskRepository.createWithTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'proj-1',
          title: 'New Task',
          status: 'TODO',
          priority: 'MEDIUM',
          tagIds: [],
          assigneeIds: [],
        }),
        expect.any(Object),
      );
    });

    it('should validate assignees and throw BadRequestException when invalid', async () => {
      taskRepository.findProjectByWorkspaceAndId.mockResolvedValue({ id: 'proj-1' });
      userClientService.validateUserIds.mockResolvedValue(false);

      await expect(
        service.create('ws-1', 'proj-1', {
          title: 'New Task',
          assignees: ['invalid-user'],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(taskRepository.createWithTransaction).not.toHaveBeenCalled();
    });

    it('should resolve tags via workspace client when provided', async () => {
      taskRepository.findProjectByWorkspaceAndId.mockResolvedValue({ id: 'proj-1' });
      workspaceClientService.resolveOrCreateTags.mockResolvedValue(['tag-1']);
      taskRepository.createWithTransaction.mockResolvedValue(mockTask);

      await service.create('ws-1', 'proj-1', {
        title: 'New Task',
        tags: ['urgent'],
      }, undefined, 'Bearer token');

      expect(workspaceClientService.resolveOrCreateTags).toHaveBeenCalledWith(
        'ws-1',
        ['urgent'],
        'Bearer token',
      );
      expect(taskRepository.createWithTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ tagIds: ['tag-1'] }),
        expect.any(Object),
      );
    });
  });

  describe('update', () => {
    it('should update task', async () => {
      taskRepository.findFirstByIdAndProjectId.mockResolvedValue(mockTask);
      taskRepository.findProjectByWorkspaceAndId.mockResolvedValue({ id: 'proj-1' });
      taskRepository.updateWithTransaction.mockResolvedValue({ ...mockTask, title: 'Updated' });

      const result = await service.update('ws-1', 'proj-1', 'task-1', {
        title: 'Updated',
      });

      expect(result.title).toBe('Updated');
    });

    it('should throw BadRequestException when assignees invalid', async () => {
      taskRepository.findFirstByIdAndProjectId.mockResolvedValue(mockTask);
      taskRepository.findProjectByWorkspaceAndId.mockResolvedValue({ id: 'proj-1' });
      userClientService.validateUserIds.mockResolvedValue(false);

      await expect(
        service.update('ws-1', 'proj-1', 'task-1', { assignees: ['invalid'] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete task and return true', async () => {
      taskRepository.findFirstByIdAndProjectId.mockResolvedValue(mockTask);
      taskRepository.findProjectByWorkspaceAndId.mockResolvedValue({ id: 'proj-1' });
      taskRepository.delete.mockResolvedValue(undefined);

      const result = await service.remove('ws-1', 'proj-1', 'task-1');

      expect(result).toBe(true);
      expect(taskRepository.delete).toHaveBeenCalledWith('task-1');
    });
  });
});
