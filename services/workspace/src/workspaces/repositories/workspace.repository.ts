import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from 'generated/prisma/client';
import { ParticipantRole } from 'generated/prisma/client';
import type { Workspace } from 'generated/prisma/client';

@Injectable()
export class WorkspaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(): Promise<Workspace[]> {
    return this.prisma.workspace.findMany({
      orderBy: { name: 'asc' },
    });
  }

  findManyPaginatedByUserId(
    userId: string,
    opts: {
      skip: number;
      take: number;
      orderBy: Prisma.WorkspaceOrderByWithRelationInput;
    },
  ): Promise<Workspace[]> {
    return this.prisma.workspace.findMany({
      where: { participants: { some: { userId } } },
      orderBy: opts.orderBy,
      skip: opts.skip,
      take: opts.take,
    });
  }

  countByUserId(userId: string): Promise<number> {
    return this.prisma.workspace.count({
      where: { participants: { some: { userId } } },
    });
  }

  findUniqueById(id: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({
      where: { id },
    });
  }

  create(data: Prisma.WorkspaceUncheckedCreateInput): Promise<Workspace> {
    return this.prisma.workspace.create({
      data,
    });
  }

  createWithTransaction(
    workspaceData: Prisma.WorkspaceUncheckedCreateInput,
    creatorUserId?: string,
  ): Promise<Workspace> {
    return this.prisma.$transaction(async (tx) => {
      const workspace = await (tx as typeof this.prisma).workspace.create({
        data: workspaceData,
      });
      if (creatorUserId) {
        await (tx as typeof this.prisma).participant.create({
          data: {
            userId: creatorUserId,
            workspaceId: workspace.id,
            role: ParticipantRole.Admin,
          },
        });
      }
      return workspace;
    });
  }

  update(
    id: string,
    data: Prisma.WorkspaceUpdateInput,
  ): Promise<Workspace> {
    return this.prisma.workspace.update({
      where: { id },
      data,
    });
  }

  delete(id: string): Promise<Workspace> {
    return this.prisma.workspace.delete({
      where: { id },
    });
  }

  findParticipantByUserAndWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<{ role: string } | null> {
    return this.prisma.participant.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      select: { role: true },
    });
  }
}
