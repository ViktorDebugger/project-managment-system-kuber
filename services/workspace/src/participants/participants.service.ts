import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type PaginationDto,
  type PaginationMeta,
} from '@project-management/shared';
import type { Participant } from 'generated/prisma/client';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { UserClientService } from '../users/user-client.service';
import { ParticipantRepository } from './repositories/participant.repository';

const PARTICIPANT_SORT_FIELDS = ['id', 'userId', 'role'] as const;

@Injectable()
export class ParticipantsService {
  constructor(
    private readonly participantRepository: ParticipantRepository,
    private readonly userClientService: UserClientService,
  ) {}

  async findAllByWorkspaceId(
    workspaceId: string,
    pagination: PaginationDto,
  ): Promise<{ data: Participant[]; meta: PaginationMeta }> {
    await this.ensureWorkspaceExists(workspaceId);
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 10;
    const sortBy =
      PARTICIPANT_SORT_FIELDS.includes(
        pagination.sortBy as (typeof PARTICIPANT_SORT_FIELDS)[number],
      ) ? pagination.sortBy!
      : 'id';
    const order = pagination.order ?? 'desc';
    const skip = (page - 1) * limit;
    const take = limit;
    const orderBy = { [sortBy]: order };
    const [data, total] = await Promise.all([
      this.participantRepository.findManyByWorkspaceIdPaginated(workspaceId, {
        skip,
        take,
        orderBy,
      }),
      this.participantRepository.countByWorkspaceId(workspaceId),
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
    participantId: string,
  ): Promise<Participant> {
    const participant =
      await this.participantRepository.findFirstByIdAndWorkspaceId(
        participantId,
        workspaceId,
      );
    if (!participant) throw new NotFoundException('Participant not found');
    return participant;
  }

  async create(
    workspaceId: string,
    dto: CreateParticipantDto,
  ): Promise<Participant> {
    await this.ensureWorkspaceExists(workspaceId);
    const valid = await this.userClientService.validateUserIds([dto.userId]);
    if (!valid) throw new NotFoundException('User not found');

    const existing =
      await this.participantRepository.findUniqueByUserIdAndWorkspaceId(
        dto.userId,
        workspaceId,
      );
    if (existing) {
      throw new ConflictException(
        'User is already a participant of this workspace',
      );
    }

    return this.participantRepository.create({
      workspaceId,
      userId: dto.userId,
      role: dto.role,
    });
  }

  async update(
    workspaceId: string,
    participantId: string,
    dto: Partial<UpdateParticipantDto>,
  ): Promise<Participant> {
    await this.findOne(workspaceId, participantId);
    return this.participantRepository.update(participantId, {
      ...(dto.role !== undefined && { role: dto.role }),
    });
  }

  async remove(workspaceId: string, participantId: string): Promise<boolean> {
    await this.findOne(workspaceId, participantId);
    await this.participantRepository.delete(participantId);
    return true;
  }

  private async ensureWorkspaceExists(workspaceId: string): Promise<void> {
    const workspace =
      await this.participantRepository.findWorkspaceById(workspaceId);
    if (!workspace) throw new NotFoundException('Workspace not found');
  }
}
