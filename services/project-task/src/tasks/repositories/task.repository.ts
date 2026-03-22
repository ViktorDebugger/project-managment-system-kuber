import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from 'generated/prisma/client';
import type { Task, Project } from 'generated/prisma/client';

@Injectable()
export class TaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByProjectIdPaginated(
    projectId: string,
    opts: {
      skip: number;
      take: number;
      orderBy: Prisma.TaskOrderByWithRelationInput;
    },
  ): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: { projectId },
      orderBy: opts.orderBy,
      skip: opts.skip,
      take: opts.take,
      include: { sprint: true },
    });
  }

  countByProjectId(projectId: string): Promise<number> {
    return this.prisma.task.count({
      where: { projectId },
    });
  }

  findFirstByIdAndProjectId(
    taskId: string,
    projectId: string,
  ): Promise<Task | null> {
    return this.prisma.task.findFirst({
      where: { id: taskId, projectId },
      include: {
        comments: true,
        sprint: true,
      },
    });
  }

  create(data: Prisma.TaskUncheckedCreateInput): Promise<Task> {
    return this.prisma.task.create({
      data,
    });
  }

  createWithTransaction(
    taskData: Prisma.TaskUncheckedCreateInput,
    logParams: { action: string; message?: string; userId?: string },
  ): Promise<Task> {
    return this.prisma.$transaction(async (tx) => {
      const task = await (tx as typeof this.prisma).task.create({
        data: taskData,
      });
      await (tx as typeof this.prisma).log.create({
        data: {
          taskId: task.id,
          action: logParams.action,
          message: logParams.message,
          userId: logParams.userId,
        },
      });
      return task;
    });
  }

  update(
    taskId: string,
    data: Prisma.TaskUpdateInput,
  ): Promise<Task> {
    return this.prisma.task.update({
      where: { id: taskId },
      data,
    });
  }

  updateWithTransaction(
    taskId: string,
    taskData: Prisma.TaskUpdateInput,
    logParams: { action: string; message?: string; userId?: string },
  ): Promise<Task> {
    return this.prisma.$transaction(async (tx) => {
      const task = await (tx as typeof this.prisma).task.update({
        where: { id: taskId },
        data: taskData,
      });
      await (tx as typeof this.prisma).log.create({
        data: {
          taskId: task.id,
          action: logParams.action,
          message: logParams.message,
          userId: logParams.userId,
        },
      });
      return task;
    });
  }

  delete(taskId: string): Promise<Task> {
    return this.prisma.task.delete({
      where: { id: taskId },
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
