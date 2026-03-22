import { Injectable, NotFoundException } from '@nestjs/common';
import type { Sprint, Task } from 'generated/prisma/client';
import {
  type PaginationDto,
  type PaginationMeta,
} from '@project-management/shared';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { SprintRepository } from './repositories/sprint.repository';

const SPRINT_SORT_FIELDS = [
  'name',
  'startDate',
  'endDate',
  'createdAt',
  'updatedAt',
] as const;

@Injectable()
export class SprintsService {
  constructor(private readonly sprintRepository: SprintRepository) {}

  async findAllByProjectId(
    workspaceId: string,
    projectId: string,
    pagination: PaginationDto,
  ): Promise<{ data: Sprint[]; meta: PaginationMeta }> {
    await this.ensureProjectBelongsToWorkspace(workspaceId, projectId);
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 10;
    const sortBy =
      SPRINT_SORT_FIELDS.includes(
        pagination.sortBy as (typeof SPRINT_SORT_FIELDS)[number],
      ) ? pagination.sortBy!
      : 'createdAt';
    const order = pagination.order ?? 'desc';
    const skip = (page - 1) * limit;
    const take = limit;
    const orderBy = { [sortBy]: order };
    const [data, total] = await Promise.all([
      this.sprintRepository.findManyByProjectIdPaginated(projectId, {
        skip,
        take,
        orderBy,
      }),
      this.sprintRepository.countByProjectId(projectId),
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

  async findOne(
    workspaceId: string,
    projectId: string,
    sprintId: string,
  ): Promise<Sprint> {
    const sprint = await this.sprintRepository.findFirstByIdAndProjectId(
      sprintId,
      projectId,
    );
    if (!sprint) throw new NotFoundException('Sprint not found');
    await this.ensureProjectBelongsToWorkspace(workspaceId, projectId);
    return sprint;
  }

  async create(
    workspaceId: string,
    projectId: string,
    dto: CreateSprintDto,
  ): Promise<Sprint> {
    await this.ensureProjectBelongsToWorkspace(workspaceId, projectId);
    return this.sprintRepository.create({
      projectId,
      name: dto.name,
      ...(dto.goal !== undefined && { goal: dto.goal }),
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
    });
  }

  async update(
    workspaceId: string,
    projectId: string,
    sprintId: string,
    dto: Partial<UpdateSprintDto>,
  ): Promise<Sprint> {
    await this.findOne(workspaceId, projectId, sprintId);
    return this.sprintRepository.update(sprintId, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.goal !== undefined && { goal: dto.goal }),
      ...(dto.startDate !== undefined && {
        startDate: new Date(dto.startDate),
      }),
      ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
    });
  }

  async remove(
    workspaceId: string,
    projectId: string,
    sprintId: string,
  ): Promise<boolean> {
    await this.findOne(workspaceId, projectId, sprintId);
    await this.sprintRepository.delete(sprintId);
    return true;
  }

  async findTasksBySprintId(
    workspaceId: string,
    projectId: string,
    sprintId: string,
  ): Promise<Task[]> {
    await this.findOne(workspaceId, projectId, sprintId);
    return this.sprintRepository.findTasksBySprintId(sprintId);
  }

  private async ensureProjectBelongsToWorkspace(
    workspaceId: string,
    projectId: string,
  ): Promise<void> {
    const project =
      await this.sprintRepository.findProjectByWorkspaceAndId(
        workspaceId,
        projectId,
      );
    if (!project) throw new NotFoundException('Project not found');
  }
}
