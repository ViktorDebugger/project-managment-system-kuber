import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type { Workspace } from 'generated/prisma/client';
import {
  type PaginationDto,
  type PaginationMeta,
} from '@project-management/shared';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspaceRepository } from './repositories/workspace.repository';

const WORKSPACE_SORT_FIELDS = ['name', 'createdAt', 'updatedAt'] as const;
const DEFAULT_CACHE_TTL_SECONDS = 300;
const workspaceCacheKey = (id: string) => `workspace:${id}`;

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configService: ConfigService,
  ) {}

  async findAll(
    pagination: PaginationDto,
    userId: string,
  ): Promise<{ data: Workspace[]; meta: PaginationMeta }> {
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 10;
    const sortBy =
      WORKSPACE_SORT_FIELDS.includes(
        pagination.sortBy as (typeof WORKSPACE_SORT_FIELDS)[number],
      ) ? pagination.sortBy!
      : 'createdAt';
    const order = pagination.order ?? 'desc';
    const skip = (page - 1) * limit;
    const take = limit;
    const orderBy = { [sortBy]: order };
    const [data, total] = await Promise.all([
      this.workspaceRepository.findManyPaginatedByUserId(userId, {
        skip,
        take,
        orderBy,
      }),
      this.workspaceRepository.countByUserId(userId),
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

  async findOne(id: string): Promise<Workspace> {
    const key = workspaceCacheKey(id);
    const cached = await this.cache.get<Workspace>(key);
    if (cached) return cached;
    const workspace = await this.workspaceRepository.findUniqueById(id);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    const ttlSeconds = this.configService.get<number>('CACHE_TTL_SECONDS') ?? DEFAULT_CACHE_TTL_SECONDS;
    await this.cache.set(key, workspace, ttlSeconds * 1000);
    return workspace;
  }

  async create(
    dto: CreateWorkspaceDto,
    creatorUserId?: string,
  ): Promise<Workspace> {
    return this.workspaceRepository.createWithTransaction(
      { name: dto.name, ...(dto.description !== undefined && { description: dto.description }) },
      creatorUserId,
    );
  }

  async update(
    id: string,
    dto: Partial<UpdateWorkspaceDto>,
  ): Promise<Workspace> {
    await this.findOne(id);
    const updated = await this.workspaceRepository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
    });
    await this.cache.del(workspaceCacheKey(id));
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    await this.findOne(id);
    await this.workspaceRepository.delete(id);
    await this.cache.del(workspaceCacheKey(id));
    return true;
  }

  async findParticipantByUser(
    workspaceId: string,
    userId: string,
  ): Promise<{ role: string } | null> {
    return this.workspaceRepository.findParticipantByUserAndWorkspace(
      userId,
      workspaceId,
    );
  }
}
