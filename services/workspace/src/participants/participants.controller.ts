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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkspaceAdminGuard } from '../auth/guards/workspace-admin.guard';
import {
  type PaginationMeta,
  PaginationDto,
} from '@project-management/shared';
import type { Participant } from 'generated/prisma/client';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { ParticipantsService } from './participants.service';

@ApiBearerAuth()
@Controller('workspaces/:workspaceId/participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['id', 'userId', 'role'],
  })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Query() pagination: PaginationDto,
  ): Promise<{ data: Participant[]; meta: PaginationMeta }> {
    return this.participantsService.findAllByWorkspaceId(
      workspaceId,
      pagination,
    );
  }

  @Get(':participantId')
  @HttpCode(HttpStatus.OK)
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('participantId') participantId: string,
  ): Promise<Participant> {
    return this.participantsService.findOne(workspaceId, participantId);
  }

  @UseGuards(WorkspaceAdminGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateParticipantDto,
  ): Promise<Participant> {
    return this.participantsService.create(workspaceId, dto);
  }

  @UseGuards(WorkspaceAdminGuard)
  @Put(':participantId')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('participantId') participantId: string,
    @Body() dto: Partial<UpdateParticipantDto>,
  ): Promise<Participant> {
    return this.participantsService.update(workspaceId, participantId, dto);
  }

  @UseGuards(WorkspaceAdminGuard)
  @Delete(':participantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('participantId') participantId: string,
  ): Promise<boolean> {
    return this.participantsService.remove(workspaceId, participantId);
  }
}
