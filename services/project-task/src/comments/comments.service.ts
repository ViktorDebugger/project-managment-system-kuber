import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type PaginationDto,
  type PaginationMeta,
} from '@project-management/shared';
import type { Comment } from 'generated/prisma/client';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentRepository } from './repositories/comment.repository';

const COMMENT_SORT_FIELDS = ['id', 'content', 'createdAt', 'updatedAt'] as const;

@Injectable()
export class CommentsService {
  constructor(private readonly commentRepository: CommentRepository) {}

  async findAllByTaskId(
    workspaceId: string,
    projectId: string,
    taskId: string,
    pagination: PaginationDto,
  ): Promise<{ data: Comment[]; meta: PaginationMeta }> {
    await this.ensureTaskBelongsToWorkspace(workspaceId, projectId, taskId);
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 10;
    const sortBy =
      COMMENT_SORT_FIELDS.includes(
        pagination.sortBy as (typeof COMMENT_SORT_FIELDS)[number],
      ) ? pagination.sortBy!
      : 'createdAt';
    const order = pagination.order ?? 'asc';
    const skip = (page - 1) * limit;
    const take = limit;
    const orderBy = { [sortBy]: order };
    const [data, total] = await Promise.all([
      this.commentRepository.findManyByTaskIdPaginated(taskId, {
        skip,
        take,
        orderBy,
      }),
      this.commentRepository.countByTaskId(taskId),
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
    taskId: string,
    commentId: string,
  ): Promise<Comment> {
    const comment =
      await this.commentRepository.findFirstByIdAndTaskId(commentId, taskId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    await this.ensureTaskBelongsToWorkspace(workspaceId, projectId, taskId);
    return comment;
  }

  async create(
    workspaceId: string,
    projectId: string,
    taskId: string,
    dto: CreateCommentDto,
  ): Promise<Comment> {
    await this.ensureTaskBelongsToWorkspace(workspaceId, projectId, taskId);
    return this.commentRepository.create({
      taskId,
      content: dto.content,
    });
  }

  async update(
    workspaceId: string,
    projectId: string,
    taskId: string,
    commentId: string,
    dto: Partial<UpdateCommentDto>,
  ): Promise<Comment> {
    await this.findOne(workspaceId, projectId, taskId, commentId);
    const body = dto ?? {};
    return this.commentRepository.update(commentId, {
      ...(body.content !== undefined && { content: body.content }),
    });
  }

  async remove(
    workspaceId: string,
    projectId: string,
    taskId: string,
    commentId: string,
  ): Promise<boolean> {
    await this.findOne(workspaceId, projectId, taskId, commentId);
    await this.commentRepository.delete(commentId);
    return true;
  }

  private async ensureTaskBelongsToWorkspace(
    workspaceId: string,
    projectId: string,
    taskId: string,
  ): Promise<void> {
    const task =
      await this.commentRepository.findTaskByProjectAndWorkspace(
        taskId,
        projectId,
        workspaceId,
      );
    if (!task) {
      throw new NotFoundException('Task not found');
    }
  }
}
