jest.mock('generated/prisma/client', () => ({ PrismaClient: jest.fn() }));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentRepository } from './repositories/comment.repository';

describe('CommentsService', () => {
  let service: CommentsService;
  let commentRepository: {
    findManyByTaskIdPaginated: jest.Mock;
    countByTaskId: jest.Mock;
    findFirstByIdAndTaskId: jest.Mock;
    findTaskByProjectAndWorkspace: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  const mockComment = {
    id: 'comm-1',
    taskId: 'task-1',
    content: 'Test comment',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    commentRepository = {
      findManyByTaskIdPaginated: jest.fn(),
      countByTaskId: jest.fn(),
      findFirstByIdAndTaskId: jest.fn(),
      findTaskByProjectAndWorkspace: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: CommentRepository, useValue: commentRepository },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  describe('findAllByTaskId', () => {
    it('should return paginated comments', async () => {
      commentRepository.findTaskByProjectAndWorkspace.mockResolvedValue({ id: 'task-1' });
      commentRepository.findManyByTaskIdPaginated.mockResolvedValue([mockComment]);
      commentRepository.countByTaskId.mockResolvedValue(1);

      const result = await service.findAllByTaskId(
        'ws-1',
        'proj-1',
        'task-1',
        { page: 1, limit: 10 },
      );

      expect(result.data).toEqual([mockComment]);
      expect(result.meta.total).toBe(1);
    });

    it('should throw NotFoundException when task not in workspace', async () => {
      commentRepository.findTaskByProjectAndWorkspace.mockResolvedValue(null);

      await expect(
        service.findAllByTaskId('ws-1', 'proj-1', 'task-1', {
          page: 1,
          limit: 10,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return comment when found', async () => {
      commentRepository.findFirstByIdAndTaskId.mockResolvedValue(mockComment);
      commentRepository.findTaskByProjectAndWorkspace.mockResolvedValue({ id: 'task-1' });

      const result = await service.findOne('ws-1', 'proj-1', 'task-1', 'comm-1');

      expect(result).toBe(mockComment);
    });

    it('should throw NotFoundException when comment not found', async () => {
      commentRepository.findFirstByIdAndTaskId.mockResolvedValue(null);

      await expect(
        service.findOne('ws-1', 'proj-1', 'task-1', 'unknown'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create comment', async () => {
      commentRepository.findTaskByProjectAndWorkspace.mockResolvedValue({ id: 'task-1' });
      commentRepository.create.mockResolvedValue(mockComment);

      const result = await service.create('ws-1', 'proj-1', 'task-1', {
        content: 'New comment',
      });

      expect(result).toBe(mockComment);
      expect(commentRepository.create).toHaveBeenCalledWith({
        taskId: 'task-1',
        content: 'New comment',
      });
    });

    it('should throw NotFoundException when task not found', async () => {
      commentRepository.findTaskByProjectAndWorkspace.mockResolvedValue(null);

      await expect(
        service.create('ws-1', 'proj-1', 'task-1', { content: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update comment', async () => {
      commentRepository.findFirstByIdAndTaskId.mockResolvedValue(mockComment);
      commentRepository.findTaskByProjectAndWorkspace.mockResolvedValue({ id: 'task-1' });
      commentRepository.update.mockResolvedValue({
        ...mockComment,
        content: 'Updated',
      });

      const result = await service.update(
        'ws-1',
        'proj-1',
        'task-1',
        'comm-1',
        { content: 'Updated' },
      );

      expect(result.content).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should delete comment and return true', async () => {
      commentRepository.findFirstByIdAndTaskId.mockResolvedValue(mockComment);
      commentRepository.findTaskByProjectAndWorkspace.mockResolvedValue({ id: 'task-1' });
      commentRepository.delete.mockResolvedValue(undefined);

      const result = await service.remove('ws-1', 'proj-1', 'task-1', 'comm-1');

      expect(result).toBe(true);
      expect(commentRepository.delete).toHaveBeenCalledWith('comm-1');
    });
  });
});
