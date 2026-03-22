import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  type PaginationMeta,
  PaginationDto,
} from '@project-management/shared';
import type { Comment } from 'generated/prisma/client';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentsService } from './comments.service';

@ApiBearerAuth()
@Controller(
  'workspaces/:workspaceId/projects/:projectId/tasks/:taskId/comments',
)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'updatedAt', 'id', 'content'],
  })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Query() pagination: PaginationDto,
  ): Promise<{ data: Comment[]; meta: PaginationMeta }> {
    return this.commentsService.findAllByTaskId(
      workspaceId,
      projectId,
      taskId,
      pagination,
    );
  }

  @Get(':commentId')
  @HttpCode(HttpStatus.OK)
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
  ): Promise<Comment> {
    return this.commentsService.findOne(
      workspaceId,
      projectId,
      taskId,
      commentId,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<Comment> {
    return this.commentsService.create(workspaceId, projectId, taskId, dto);
  }

  @Put(':commentId')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @Body() dto: Partial<UpdateCommentDto>,
  ): Promise<Comment> {
    return this.commentsService.update(
      workspaceId,
      projectId,
      taskId,
      commentId,
      dto,
    );
  }

  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
  ): Promise<boolean> {
    return this.commentsService.remove(
      workspaceId,
      projectId,
      taskId,
      commentId,
    );
  }
}
