jest.mock('generated/prisma/client', () => ({ PrismaClient: jest.fn() }));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectRepository } from './repositories/project.repository';
import { WorkspaceClientService } from '../clients/workspace-client.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectRepository: {
    findManyByWorkspaceIdPaginated: jest.Mock;
    countByWorkspaceId: jest.Mock;
    findFirstByIdAndWorkspaceId: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let workspaceClientService: { ensureWorkspaceExists: jest.Mock };

  const mockProject = {
    id: 'proj-1',
    workspaceId: 'ws-1',
    name: 'Test Project',
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    projectRepository = {
      findManyByWorkspaceIdPaginated: jest.fn(),
      countByWorkspaceId: jest.fn(),
      findFirstByIdAndWorkspaceId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    workspaceClientService = { ensureWorkspaceExists: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: ProjectRepository, useValue: projectRepository },
        { provide: WorkspaceClientService, useValue: workspaceClientService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  describe('findAllByWorkspaceId', () => {
    it('should return paginated projects', async () => {
      projectRepository.findManyByWorkspaceIdPaginated.mockResolvedValue([mockProject]);
      projectRepository.countByWorkspaceId.mockResolvedValue(1);

      const result = await service.findAllByWorkspaceId('ws-1', { page: 1, limit: 10 });

      expect(result.data).toEqual([mockProject]);
      expect(result.meta).toMatchObject({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
      expect(workspaceClientService.ensureWorkspaceExists).toHaveBeenCalledWith('ws-1', undefined);
    });
  });

  describe('findOne', () => {
    it('should return project when found', async () => {
      projectRepository.findFirstByIdAndWorkspaceId.mockResolvedValue(mockProject);

      const result = await service.findOne('ws-1', 'proj-1');

      expect(result).toBe(mockProject);
    });

    it('should throw NotFoundException when not found', async () => {
      projectRepository.findFirstByIdAndWorkspaceId.mockResolvedValue(null);

      await expect(service.findOne('ws-1', 'unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create project', async () => {
      projectRepository.create.mockResolvedValue(mockProject);

      const result = await service.create('ws-1', { name: 'New Project' });

      expect(result).toBe(mockProject);
      expect(workspaceClientService.ensureWorkspaceExists).toHaveBeenCalledWith('ws-1', undefined);
      expect(projectRepository.create).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        name: 'New Project',
      });
    });
  });

  describe('update', () => {
    it('should update project', async () => {
      projectRepository.findFirstByIdAndWorkspaceId.mockResolvedValue(mockProject);
      projectRepository.update.mockResolvedValue({ ...mockProject, name: 'Updated' });

      const result = await service.update('ws-1', 'proj-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException when project not found', async () => {
      projectRepository.findFirstByIdAndWorkspaceId.mockResolvedValue(null);

      await expect(
        service.update('ws-1', 'unknown', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete project and return true', async () => {
      projectRepository.findFirstByIdAndWorkspaceId.mockResolvedValue(mockProject);
      projectRepository.delete.mockResolvedValue(undefined);

      const result = await service.remove('ws-1', 'proj-1');

      expect(result).toBe(true);
      expect(projectRepository.delete).toHaveBeenCalledWith('proj-1');
    });
  });
});
