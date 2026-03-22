jest.mock('generated/prisma/client', () => ({ PrismaClient: jest.fn() }));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TagsService } from './tags.service';
import { TagRepository } from './repositories/tag.repository';

describe('TagsService', () => {
  let service: TagsService;
  let tagRepository: {
    findManyByWorkspaceIdPaginated: jest.Mock;
    countByWorkspaceId: jest.Mock;
    findFirstByIdAndWorkspaceId: jest.Mock;
    findWorkspaceById: jest.Mock;
    resolveOrCreateByNames: jest.Mock;
    delete: jest.Mock;
  };

  const mockTag = {
    id: 'tag-1',
    name: 'urgent',
    workspaceId: 'ws-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    tagRepository = {
      findManyByWorkspaceIdPaginated: jest.fn(),
      countByWorkspaceId: jest.fn(),
      findFirstByIdAndWorkspaceId: jest.fn(),
      findWorkspaceById: jest.fn(),
      resolveOrCreateByNames: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        { provide: TagRepository, useValue: tagRepository },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
  });

  describe('findAllByWorkspace', () => {
    it('should return paginated tags', async () => {
      tagRepository.findWorkspaceById.mockResolvedValue({ id: 'ws-1' });
      tagRepository.findManyByWorkspaceIdPaginated.mockResolvedValue([mockTag]);
      tagRepository.countByWorkspaceId.mockResolvedValue(1);

      const result = await service.findAllByWorkspace('ws-1', { page: 1, limit: 10 });

      expect(result.data).toEqual([mockTag]);
      expect(result.meta.total).toBe(1);
    });

    it('should throw NotFoundException when workspace not found', async () => {
      tagRepository.findWorkspaceById.mockResolvedValue(null);

      await expect(
        service.findAllByWorkspace('unknown', { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resolveOrCreate', () => {
    it('should return tagIds for resolved/created tags', async () => {
      tagRepository.findWorkspaceById.mockResolvedValue({ id: 'ws-1' });
      tagRepository.resolveOrCreateByNames.mockResolvedValue(['tag-1', 'tag-2']);

      const result = await service.resolveOrCreate('ws-1', ['urgent', 'bug']);

      expect(result).toEqual({ tagIds: ['tag-1', 'tag-2'] });
      expect(tagRepository.resolveOrCreateByNames).toHaveBeenCalledWith('ws-1', ['urgent', 'bug']);
    });

    it('should return empty array when names empty', async () => {
      tagRepository.findWorkspaceById.mockResolvedValue({ id: 'ws-1' });

      const result = await service.resolveOrCreate('ws-1', []);

      expect(result).toEqual({ tagIds: [] });
      expect(tagRepository.resolveOrCreateByNames).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete tag and return true', async () => {
      tagRepository.findFirstByIdAndWorkspaceId.mockResolvedValue(mockTag);
      tagRepository.delete.mockResolvedValue(undefined);

      const result = await service.delete('ws-1', 'tag-1');

      expect(result).toBe(true);
      expect(tagRepository.delete).toHaveBeenCalledWith('tag-1');
    });

    it('should throw NotFoundException when tag not found', async () => {
      tagRepository.findFirstByIdAndWorkspaceId.mockResolvedValue(null);

      await expect(service.delete('ws-1', 'unknown')).rejects.toThrow(
        NotFoundException,
      );
      expect(tagRepository.delete).not.toHaveBeenCalled();
    });
  });
});
