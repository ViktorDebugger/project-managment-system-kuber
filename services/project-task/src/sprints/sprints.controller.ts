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
import type { Sprint, Task } from 'generated/prisma/client';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { SprintsService } from './sprints.service';

@ApiBearerAuth()
@Controller('workspaces/:workspaceId/projects/:projectId/sprints')
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'updatedAt', 'name', 'startDate', 'endDate'],
  })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Query() pagination: PaginationDto,
  ): Promise<{ data: Sprint[]; meta: PaginationMeta }> {
    return this.sprintsService.findAllByProjectId(
      workspaceId,
      projectId,
      pagination,
    );
  }

  @Get(':sprintId/tasks')
  @HttpCode(HttpStatus.OK)
  findTasks(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
  ): Promise<Task[]> {
    return this.sprintsService.findTasksBySprintId(
      workspaceId,
      projectId,
      sprintId,
    );
  }

  @Get(':sprintId')
  @HttpCode(HttpStatus.OK)
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
  ): Promise<Sprint> {
    return this.sprintsService.findOne(workspaceId, projectId, sprintId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateSprintDto,
  ): Promise<Sprint> {
    return this.sprintsService.create(workspaceId, projectId, dto);
  }

  @Put(':sprintId')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Body() dto: Partial<UpdateSprintDto>,
  ): Promise<Sprint> {
    return this.sprintsService.update(workspaceId, projectId, sprintId, dto);
  }

  @Delete(':sprintId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
  ): Promise<boolean> {
    return this.sprintsService.remove(workspaceId, projectId, sprintId);
  }
}
