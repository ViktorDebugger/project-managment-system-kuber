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

export type ParticipantWithUser = Participant & {
  user: { id: string; username: string; email: string; fullname: string };
};

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
  ): Promise<{ data: ParticipantWithUser[]; meta: PaginationMeta }> {
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
    const [participants, total] = await Promise.all([
      this.participantRepository.findManyByWorkspaceIdPaginated(workspaceId, {
        skip,
        take,
        orderBy,
      }),
      this.participantRepository.countByWorkspaceId(workspaceId),
    ]);
    const userIds = [...new Set(participants.map((p) => p.userId))];
    const users = await this.userClientService.getUsersByIds(userIds);
    const userMap = new Map(users.map((u) => [u.id, u]));
    const data: ParticipantWithUser[] = participants.map((p) => ({
      ...p,
      user: userMap.get(p.userId) ?? {
        id: p.userId,
        username: '',
        email: '',
        fullname: '',
      },
    }));
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
  ): Promise<ParticipantWithUser> {
    const participant =
      await this.participantRepository.findFirstByIdAndWorkspaceId(
        participantId,
        workspaceId,
      );
    if (!participant) throw new NotFoundException('Participant not found');
    const [user] = await this.userClientService.getUsersByIds([participant.userId]);
    return {
      ...participant,
      user: user ?? {
        id: participant.userId,
        username: '',
        email: '',
        fullname: '',
      },
    };
  }

  async create(
    workspaceId: string,
    dto: CreateParticipantDto,
  ): Promise<ParticipantWithUser> {
    await this.ensureWorkspaceExists(workspaceId);
    let userId: string;
    if (dto.userId) {
      const valid = await this.userClientService.validateUserIds([dto.userId]);
      if (!valid) throw new NotFoundException('User not found');
      userId = dto.userId;
    } else if (dto.email) {
      const user = await this.userClientService.getUserByEmail(dto.email);
      if (!user) throw new NotFoundException('User not found');
      userId = user.id;
    } else {
      throw new NotFoundException('Either userId or email is required');
    }

    const existing =
      await this.participantRepository.findUniqueByUserIdAndWorkspaceId(
        userId,
        workspaceId,
      );
    if (existing) {
      throw new ConflictException(
        'User is already a participant of this workspace',
      );
    }

    const participant = await this.participantRepository.create({
      workspaceId,
      userId,
      role: dto.role,
    });
    const [user] = await this.userClientService.getUsersByIds([userId]);
    return {
      ...participant,
      user: user ?? {
        id: userId,
        username: '',
        email: '',
        fullname: '',
      },
    };
  }

  async update(
    workspaceId: string,
    participantId: string,
    dto: Partial<UpdateParticipantDto>,
  ): Promise<ParticipantWithUser> {
    await this.findOne(workspaceId, participantId);
    const participant = await this.participantRepository.update(participantId, {
      ...(dto.role !== undefined && { role: dto.role }),
    });
    const [user] = await this.userClientService.getUsersByIds([participant.userId]);
    return {
      ...participant,
      user: user ?? {
        id: participant.userId,
        username: '',
        email: '',
        fullname: '',
      },
    };
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
