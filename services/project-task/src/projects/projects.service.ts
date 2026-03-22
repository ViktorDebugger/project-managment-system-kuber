import { Injectable, NotFoundException } from '@nestjs/common';
import type { Project } from 'generated/prisma/client';
import {
  type PaginationDto,
  type PaginationMeta,
} from '@project-management/shared';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectRepository } from './repositories/project.repository';
import { WorkspaceClientService } from '../clients/workspace-client.service';

const PROJECT_SORT_FIELDS = ['name', 'createdAt', 'updatedAt'] as const;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly workspaceClientService: WorkspaceClientService,
  ) {}

  async findAllByWorkspaceId(
    workspaceId: string,
    pagination: PaginationDto,
    authHeader?: string,
  ): Promise<{ data: Project[]; meta: PaginationMeta }> {
    await this.workspaceClientService.ensureWorkspaceExists(
      workspaceId,
      authHeader,
    );
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 10;
    const sortBy =
      PROJECT_SORT_FIELDS.includes(
        pagination.sortBy as (typeof PROJECT_SORT_FIELDS)[number],
      ) ? pagination.sortBy!
      : 'createdAt';
    const order = pagination.order ?? 'desc';
    const skip = (page - 1) * limit;
    const take = limit;
    const orderBy = { [sortBy]: order };
    const [data, total] = await Promise.all([
      this.projectRepository.findManyByWorkspaceIdPaginated(workspaceId, {
        skip,
        take,
        orderBy,
      }),
      this.projectRepository.countByWorkspaceId(workspaceId),
    ]);
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(workspaceId: string, projectId: string): Promise<Project> {
    const project =
      await this.projectRepository.findFirstByIdAndWorkspaceId(
        projectId,
        workspaceId,
      );
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async create(
    workspaceId: string,
    dto: CreateProjectDto,
    authHeader?: string,
  ): Promise<Project> {
    await this.workspaceClientService.ensureWorkspaceExists(
      workspaceId,
      authHeader,
    );
    return this.projectRepository.create({
      workspaceId,
      name: dto.name,
      ...(dto.description !== undefined && { description: dto.description }),
    });
  }

  async update(
    workspaceId: string,
    projectId: string,
    dto: Partial<UpdateProjectDto>,
  ): Promise<Project> {
    await this.findOne(workspaceId, projectId);
    return this.projectRepository.update(projectId, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
    });
  }

  async remove(workspaceId: string, projectId: string): Promise<boolean> {
    await this.findOne(workspaceId, projectId);
    await this.projectRepository.delete(projectId);
    return true;
  }
}
