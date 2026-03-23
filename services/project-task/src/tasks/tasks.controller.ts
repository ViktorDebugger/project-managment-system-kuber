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
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import {
  type PaginationMeta,
  PaginationDto,
} from '@project-management/shared';
import { DeadlineInSprintPipe } from './pipes/deadline-in-sprint.pipe';
import { type TaskWithAssignees, TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@ApiBearerAuth()
@Controller('workspaces/:workspaceId/projects/:projectId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'title', 'updatedAt'],
  })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Query() pagination: PaginationDto,
  ): Promise<{ data: TaskWithAssignees[]; meta: PaginationMeta }> {
    return this.tasksService.findAllByProjectId(
      workspaceId,
      projectId,
      pagination,
    );
  }

  @Get(':taskId')
  @HttpCode(HttpStatus.OK)
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ): Promise<TaskWithAssignees> {
    return this.tasksService.findOne(workspaceId, projectId, taskId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body(DeadlineInSprintPipe) dto: CreateTaskDto,
    @Request() req: { user?: { sub?: string }; headers?: { authorization?: string } },
  ): Promise<TaskWithAssignees> {
    return this.tasksService.create(
      workspaceId,
      projectId,
      dto,
      req.user?.sub,
      req.headers?.authorization,
    );
  }

  @Put(':taskId')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: UpdateTaskDto })
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body(DeadlineInSprintPipe) dto: Partial<UpdateTaskDto>,
    @Request() req: { user?: { sub?: string }; headers?: { authorization?: string } },
  ): Promise<TaskWithAssignees> {
    return this.tasksService.update(
      workspaceId,
      projectId,
      taskId,
      dto,
      req.user?.sub,
      req.headers?.authorization,
    );
  }

  @Delete(':taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ): Promise<boolean> {
    return this.tasksService.remove(workspaceId, projectId, taskId);
  }
}
