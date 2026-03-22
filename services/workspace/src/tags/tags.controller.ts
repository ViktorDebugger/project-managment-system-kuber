import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkspaceAdminGuard } from '../auth/guards/workspace-admin.guard';
import {
  type PaginationMeta,
  PaginationDto,
} from '@project-management/shared';
import type { Tag } from 'generated/prisma/client';
import { TagsService } from './tags.service';
import { ResolveTagsDto } from './dto/resolve-tags.dto';

@ApiBearerAuth()
@Controller('workspaces/:workspaceId/tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post('resolve-or-create')
  @HttpCode(HttpStatus.OK)
  resolveOrCreate(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: ResolveTagsDto,
  ): Promise<{ tagIds: string[] }> {
    return this.tagsService.resolveOrCreate(workspaceId, dto.names ?? []);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['id', 'name'],
  })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  findAllByWorkspace(
    @Param('workspaceId') workspaceId: string,
    @Query() pagination: PaginationDto,
  ): Promise<{ data: Tag[]; meta: PaginationMeta }> {
    return this.tagsService.findAllByWorkspace(workspaceId, pagination);
  }

  @UseGuards(WorkspaceAdminGuard)
  @Delete(':tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('workspaceId') workspaceId: string,
    @Param('tagId') tagId: string,
  ): Promise<boolean> {
    return this.tagsService.delete(workspaceId, tagId);
  }
}
