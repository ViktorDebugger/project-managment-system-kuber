import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from 'generated/prisma/client';
import type { Project } from 'generated/prisma/client';

@Injectable()
export class ProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByWorkspaceIdPaginated(
    workspaceId: string,
    opts: {
      skip: number;
      take: number;
      orderBy: Prisma.ProjectOrderByWithRelationInput;
    },
  ): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: { workspaceId },
      orderBy: opts.orderBy,
      skip: opts.skip,
      take: opts.take,
    });
  }

  countByWorkspaceId(workspaceId: string): Promise<number> {
    return this.prisma.project.count({
      where: { workspaceId },
    });
  }

  findFirstByIdAndWorkspaceId(
    projectId: string,
    workspaceId: string,
  ): Promise<Project | null> {
    return this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
    });
  }

  create(data: Prisma.ProjectUncheckedCreateInput): Promise<Project> {
    return this.prisma.project.create({
      data,
    });
  }

  update(
    projectId: string,
    data: Prisma.ProjectUpdateInput,
  ): Promise<Project> {
    return this.prisma.project.update({
      where: { id: projectId },
      data,
    });
  }

  delete(projectId: string): Promise<Project> {
    return this.prisma.project.delete({
      where: { id: projectId },
    });
  }
}
