import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from 'generated/prisma/client';
import type { Participant, Workspace } from 'generated/prisma/client';

@Injectable()
export class ParticipantRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByWorkspaceIdPaginated(
    workspaceId: string,
    opts: {
      skip: number;
      take: number;
      orderBy: Prisma.ParticipantOrderByWithRelationInput;
    },
  ): Promise<Participant[]> {
    return this.prisma.participant.findMany({
      where: { workspaceId },
      orderBy: opts.orderBy,
      skip: opts.skip,
      take: opts.take,
    });
  }

  countByWorkspaceId(workspaceId: string): Promise<number> {
    return this.prisma.participant.count({
      where: { workspaceId },
    });
  }

  findFirstByIdAndWorkspaceId(
    participantId: string,
    workspaceId: string,
  ): Promise<Participant | null> {
    return this.prisma.participant.findFirst({
      where: { id: participantId, workspaceId },
    });
  }

  findUniqueByUserIdAndWorkspaceId(
    userId: string,
    workspaceId: string,
  ): Promise<Participant | null> {
    return this.prisma.participant.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
  }

  create(data: Prisma.ParticipantUncheckedCreateInput): Promise<Participant> {
    return this.prisma.participant.create({
      data,
    });
  }

  update(
    participantId: string,
    data: Prisma.ParticipantUpdateInput,
  ): Promise<Participant> {
    return this.prisma.participant.update({
      where: { id: participantId },
      data,
    });
  }

  delete(participantId: string): Promise<Participant> {
    return this.prisma.participant.delete({
      where: { id: participantId },
    });
  }

  findWorkspaceById(workspaceId: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
  }
}
