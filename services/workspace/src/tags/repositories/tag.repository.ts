import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from 'generated/prisma/client';
import type { Tag, Workspace } from 'generated/prisma/client';

@Injectable()
export class TagRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByWorkspaceIdPaginated(
    workspaceId: string,
    opts: {
      skip: number;
      take: number;
      orderBy: Prisma.TagOrderByWithRelationInput;
    },
  ): Promise<Tag[]> {
    return this.prisma.tag.findMany({
      where: { workspaceId },
      orderBy: opts.orderBy,
      skip: opts.skip,
      take: opts.take,
    });
  }

  countByWorkspaceId(workspaceId: string): Promise<number> {
    return this.prisma.tag.count({
      where: { workspaceId },
    });
  }

  findFirstByIdAndWorkspaceId(
    tagId: string,
    workspaceId: string,
  ): Promise<Tag | null> {
    return this.prisma.tag.findFirst({
      where: { id: tagId, workspaceId },
    });
  }

  delete(tagId: string): Promise<Tag> {
    return this.prisma.tag.delete({
      where: { id: tagId },
    });
  }

  findWorkspaceById(workspaceId: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
  }

  async resolveOrCreateByNames(
    workspaceId: string,
    names: string[],
  ): Promise<string[]> {
    const ids: string[] = [];
    for (const name of names) {
      const tag = await this.prisma.tag.upsert({
        where: {
          name_workspaceId: { name, workspaceId },
        },
        create: { name, workspaceId },
        update: {},
      });
      ids.push(tag.id);
    }
    return ids;
  }
}
