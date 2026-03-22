import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from 'generated/prisma/client';
import type { Comment, Task } from 'generated/prisma/client';

@Injectable()
export class CommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByTaskIdPaginated(
    taskId: string,
    opts: {
      skip: number;
      take: number;
      orderBy: Prisma.CommentOrderByWithRelationInput;
    },
  ): Promise<Comment[]> {
    return this.prisma.comment.findMany({
      where: { taskId },
      orderBy: opts.orderBy,
      skip: opts.skip,
      take: opts.take,
    });
  }

  countByTaskId(taskId: string): Promise<number> {
    return this.prisma.comment.count({
      where: { taskId },
    });
  }

  findFirstByIdAndTaskId(
    commentId: string,
    taskId: string,
  ): Promise<Comment | null> {
    return this.prisma.comment.findFirst({
      where: { id: commentId, taskId },
    });
  }

  create(data: Prisma.CommentUncheckedCreateInput): Promise<Comment> {
    return this.prisma.comment.create({
      data,
    });
  }

  update(
    commentId: string,
    data: Prisma.CommentUpdateInput,
  ): Promise<Comment> {
    return this.prisma.comment.update({
      where: { id: commentId },
      data,
    });
  }

  delete(commentId: string): Promise<Comment> {
    return this.prisma.comment.delete({
      where: { id: commentId },
    });
  }

  findTaskByProjectAndWorkspace(
    taskId: string,
    projectId: string,
    workspaceId: string,
  ): Promise<Task | null> {
    return this.prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
        project: { workspaceId },
      },
    });
  }
}
