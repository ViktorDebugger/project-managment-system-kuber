import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type PaginationDto,
  type PaginationMeta,
} from '@project-management/shared';
import type { Tag } from 'generated/prisma/client';
import { TagRepository } from './repositories/tag.repository';

const TAG_SORT_FIELDS = ['id', 'name'] as const;

@Injectable()
export class TagsService {
  constructor(private readonly tagRepository: TagRepository) {}

  async findAllByWorkspace(
    workspaceId: string,
    pagination: PaginationDto,
  ): Promise<{ data: Tag[]; meta: PaginationMeta }> {
    await this.ensureWorkspaceExists(workspaceId);
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 10;
    const sortBy =
      TAG_SORT_FIELDS.includes(
        pagination.sortBy as (typeof TAG_SORT_FIELDS)[number],
      ) ? pagination.sortBy!
      : 'name';
    const order = pagination.order ?? 'asc';
    const skip = (page - 1) * limit;
    const take = limit;
    const orderBy = { [sortBy]: order };
    const [data, total] = await Promise.all([
      this.tagRepository.findManyByWorkspaceIdPaginated(workspaceId, {
        skip,
        take,
        orderBy,
      }),
      this.tagRepository.countByWorkspaceId(workspaceId),
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

  async resolveOrCreate(
    workspaceId: string,
    names: string[],
  ): Promise<{ tagIds: string[] }> {
    await this.ensureWorkspaceExists(workspaceId);
    if (names.length === 0) return { tagIds: [] };
    const tagIds = await this.tagRepository.resolveOrCreateByNames(
      workspaceId,
      names,
    );
    return { tagIds };
  }

  async delete(workspaceId: string, tagId: string): Promise<boolean> {
    const tag = await this.tagRepository.findFirstByIdAndWorkspaceId(
      tagId,
      workspaceId,
    );
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }
    await this.tagRepository.delete(tagId);
    return true;
  }

  private async ensureWorkspaceExists(workspaceId: string): Promise<void> {
    const workspace =
      await this.tagRepository.findWorkspaceById(workspaceId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
  }
}
