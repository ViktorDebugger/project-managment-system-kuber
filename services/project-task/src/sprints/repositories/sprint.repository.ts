import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from 'generated/prisma/client';
import type { Sprint, Task, Project } from 'generated/prisma/client';

@Injectable()
export class SprintRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByProjectIdPaginated(
    projectId: string,
    opts: {
      skip: number;
      take: number;
      orderBy: Prisma.SprintOrderByWithRelationInput;
    },
  ): Promise<Sprint[]> {
    return this.prisma.sprint.findMany({
      where: { projectId },
      orderBy: opts.orderBy,
      skip: opts.skip,
      take: opts.take,
      include: { _count: { select: { tasks: true } } },
    });
  }

  countByProjectId(projectId: string): Promise<number> {
    return this.prisma.sprint.count({
      where: { projectId },
    });
  }

  findFirstByIdAndProjectId(
    sprintId: string,
    projectId: string,
  ): Promise<Sprint | null> {
    return this.prisma.sprint.findFirst({
      where: { id: sprintId, projectId },
      include: { tasks: true },
    });
  }

  create(data: Prisma.SprintUncheckedCreateInput): Promise<Sprint> {
    return this.prisma.sprint.create({
      data,
    });
  }

  update(
    sprintId: string,
    data: Prisma.SprintUpdateInput,
  ): Promise<Sprint> {
    return this.prisma.sprint.update({
      where: { id: sprintId },
      data,
    });
  }

  delete(sprintId: string): Promise<Sprint> {
    return this.prisma.sprint.delete({
      where: { id: sprintId },
    });
  }

  findTasksBySprintId(sprintId: string): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: { sprintId },
      orderBy: { title: 'asc' },
      include: { sprint: true },
    });
  }

  findProjectByWorkspaceAndId(
    workspaceId: string,
    projectId: string,
  ): Promise<Project | null> {
    return this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
    });
  }
}
