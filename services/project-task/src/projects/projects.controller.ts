import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkspaceAdminGuard } from '../auth/guards/workspace-admin.guard';
import {
  type PaginationMeta,
  PaginationDto,
} from '@project-management/shared';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import type { Project } from 'generated/prisma/client';

@ApiBearerAuth()
@Controller('workspaces/:workspaceId/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'name', 'updatedAt'],
  })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Query() pagination: PaginationDto,
    @Request() req: { headers?: { authorization?: string } },
  ): Promise<{ data: Project[]; meta: PaginationMeta }> {
    return this.projectsService.findAllByWorkspaceId(
      workspaceId,
      pagination,
      req.headers?.authorization,
    );
  }

  @Get(':projectId')
  @HttpCode(HttpStatus.OK)
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ): Promise<Project> {
    return this.projectsService.findOne(workspaceId, projectId);
  }

  @UseGuards(WorkspaceAdminGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateProjectDto,
    @Request() req: { headers?: { authorization?: string } },
  ): Promise<Project> {
    return this.projectsService.create(
      workspaceId,
      dto,
      req.headers?.authorization,
    );
  }

  @UseGuards(WorkspaceAdminGuard)
  @Put(':projectId')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() dto: Partial<UpdateProjectDto>,
  ): Promise<Project> {
    return this.projectsService.update(workspaceId, projectId, dto);
  }

  @UseGuards(WorkspaceAdminGuard)
  @Delete(':projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ): Promise<boolean> {
    return this.projectsService.remove(workspaceId, projectId);
  }
}
