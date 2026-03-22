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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { WorkspaceAdminGuard } from '../auth/guards/workspace-admin.guard';
import { WorkspaceMemberGuard } from '../auth/guards/workspace-member.guard';
import {
  type PaginationMeta,
  PaginationDto,
} from '@project-management/shared';
import { WorkspacesService } from './workspaces.service';
import type { Workspace } from 'generated/prisma/client';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@ApiBearerAuth()
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

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
    @Query() pagination: PaginationDto,
    @Request() req: { user?: { sub?: string } },
  ): Promise<{ data: Workspace[]; meta: PaginationMeta }> {
    return this.workspacesService.findAll(pagination, req.user?.sub as string);
  }

  @UseGuards(WorkspaceMemberGuard)
  @Get(':workspaceId/check-admin')
  @HttpCode(HttpStatus.OK)
  async checkAdmin(
    @Param('workspaceId') workspaceId: string,
    @Request() req: { user?: { sub?: string } },
  ): Promise<{ isAdmin: boolean }> {
    const userId = req.user?.sub;
    if (!userId) return { isAdmin: false };
    const participant = await this.workspacesService.findParticipantByUser(
      workspaceId,
      userId,
    );
    return { isAdmin: participant?.role === 'Admin' };
  }

  @UseGuards(WorkspaceMemberGuard)
  @Get(':workspaceId')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('workspaceId') workspaceId: string): Promise<Workspace> {
    return this.workspacesService.findOne(workspaceId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateWorkspaceDto,
    @Request() req: { user?: { sub?: string } },
  ): Promise<Workspace> {
    return this.workspacesService.create(dto, req.user?.sub);
  }

  @UseGuards(WorkspaceAdminGuard)
  @Put(':workspaceId')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: UpdateWorkspaceDto })
  update(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: Partial<UpdateWorkspaceDto>,
  ): Promise<Workspace> {
    return this.workspacesService.update(workspaceId, dto);
  }

  @UseGuards(WorkspaceAdminGuard)
  @Delete(':workspaceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('workspaceId') workspaceId: string): Promise<boolean> {
    return this.workspacesService.remove(workspaceId);
  }
}
