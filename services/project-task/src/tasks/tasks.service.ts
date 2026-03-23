import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type PaginationDto,
  type PaginationMeta,
} from '@project-management/shared';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import type { Task, TaskPriority, TaskStatus } from 'generated/prisma/client';
import { TaskRepository } from './repositories/task.repository';
import { UserClientService } from '../clients/user-client.service';
import { WorkspaceClientService } from '../clients/workspace-client.service';

export type AssigneeInfo = { id: string; username: string; email: string; fullname: string };
export type TaskWithAssignees = Omit<Task, 'assigneeIds'> & {
  assigneeIds: string[];
  assignees: AssigneeInfo[];
};

const TASK_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;

function parseAssigneeIds(assigneeIds: unknown): string[] {
  if (Array.isArray(assigneeIds)) {
    return assigneeIds.filter((id): id is string => typeof id === 'string');
  }
  return [];
}

@Injectable()
export class TasksService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly userClientService: UserClientService,
    private readonly workspaceClientService: WorkspaceClientService,
  ) {}

  async findAllByProjectId(
    workspaceId: string,
    projectId: string,
    pagination: PaginationDto,
  ): Promise<{ data: TaskWithAssignees[]; meta: PaginationMeta }> {
    await this.ensureProjectBelongsToWorkspace(workspaceId, projectId);
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 10;
    const sortBy =
      TASK_SORT_FIELDS.includes(
        pagination.sortBy as (typeof TASK_SORT_FIELDS)[number],
      ) ? pagination.sortBy!
      : 'createdAt';
    const order = pagination.order ?? 'desc';
    const skip = (page - 1) * limit;
    const take = limit;
    const orderBy = { [sortBy]: order };
    const [tasks, total] = await Promise.all([
      this.taskRepository.findManyByProjectIdPaginated(projectId, {
        skip,
        take,
        orderBy,
      }),
      this.taskRepository.countByProjectId(projectId),
    ]);
    const allAssigneeIds = [
      ...new Set(
        tasks.flatMap((t) => parseAssigneeIds(t.assigneeIds)),
      ),
    ];
    const users = await this.userClientService.getUsersByIds(allAssigneeIds);
    const userMap = new Map(users.map((u) => [u.id, u]));
    const data: TaskWithAssignees[] = tasks.map((task) => {
      const ids = parseAssigneeIds(task.assigneeIds);
      return {
        ...task,
        assigneeIds: ids,
        assignees: ids.map((id) =>
          userMap.get(id) ?? { id, username: '', email: '', fullname: '' },
        ),
      };
    });
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
    projectId: string,
    taskId: string,
  ): Promise<TaskWithAssignees> {
    const task = await this.taskRepository.findFirstByIdAndProjectId(
      taskId,
      projectId,
    );
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    await this.ensureProjectBelongsToWorkspace(workspaceId, projectId);
    const ids = parseAssigneeIds(task.assigneeIds);
    const users = await this.userClientService.getUsersByIds(ids);
    const userMap = new Map(users.map((u) => [u.id, u]));
    return {
      ...task,
      assigneeIds: ids,
      assignees: ids.map((id) =>
        userMap.get(id) ?? { id, username: '', email: '', fullname: '' },
      ),
    };
  }

  async create(
    workspaceId: string,
    projectId: string,
    dto: CreateTaskDto,
    userId?: string,
    authHeader?: string,
  ): Promise<TaskWithAssignees> {
    await this.ensureProjectBelongsToWorkspace(workspaceId, projectId);
    if (dto.assignees?.length) {
      await this.validateAssignees(dto.assignees);
    }

    let tagIds: string[] = [];
    if (dto.tags?.length) {
      tagIds = await this.workspaceClientService.resolveOrCreateTags(
        workspaceId,
        dto.tags,
        authHeader,
      );
    }

    const taskData = {
      projectId,
      title: dto.title,
      status: (dto.status as TaskStatus) ?? 'TODO',
      ...(dto.description !== undefined && { description: dto.description }),
      priority: (dto.priority as TaskPriority) ?? 'MEDIUM',
      ...(dto.deadline && { deadline: new Date(dto.deadline) }),
      tagIds,
      assigneeIds: dto.assignees ?? [],
      ...(dto.sprintId && { sprintId: dto.sprintId }),
    };

    const task = await this.taskRepository.createWithTransaction(taskData, {
      action: 'created',
      message: `Task "${dto.title}" created`,
      userId,
    });
    const ids = parseAssigneeIds(task.assigneeIds);
    const users = await this.userClientService.getUsersByIds(ids);
    const userMap = new Map(users.map((u) => [u.id, u]));
    return {
      ...task,
      assigneeIds: ids,
      assignees: ids.map((id) =>
        userMap.get(id) ?? { id, username: '', email: '', fullname: '' },
      ),
    };
  }

  async update(
    workspaceId: string,
    projectId: string,
    taskId: string,
    dto: Partial<UpdateTaskDto>,
    userId?: string,
    authHeader?: string,
  ): Promise<TaskWithAssignees> {
    await this.findOne(workspaceId, projectId, taskId);
    if (dto.assignees !== undefined && dto.assignees.length > 0) {
      await this.validateAssignees(dto.assignees);
    }

    let tagIds: string[] | undefined;
    if (dto.tags !== undefined) {
      tagIds =
        dto.tags.length > 0
          ? await this.workspaceClientService.resolveOrCreateTags(
              workspaceId,
              dto.tags,
              authHeader,
            )
          : [];
    }

    const updateData: Record<string, unknown> = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.priority !== undefined && { priority: dto.priority }),
      ...(dto.deadline !== undefined && {
        deadline: dto.deadline ? new Date(dto.deadline) : null,
      }),
      ...(dto.assignees !== undefined && {
        assigneeIds: dto.assignees,
      }),
      ...(dto.sprintId !== undefined && { sprintId: dto.sprintId || null }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(tagIds !== undefined && { tagIds }),
    };

    const task = await this.taskRepository.updateWithTransaction(
      taskId,
      updateData,
      {
        action: 'updated',
        message: this.describeChanges(dto),
        userId,
      },
    );
    const ids = parseAssigneeIds(task.assigneeIds);
    const users = await this.userClientService.getUsersByIds(ids);
    const userMap = new Map(users.map((u) => [u.id, u]));
    return {
      ...task,
      assigneeIds: ids,
      assignees: ids.map((id) =>
        userMap.get(id) ?? { id, username: '', email: '', fullname: '' },
      ),
    };
  }

  async remove(
    workspaceId: string,
    projectId: string,
    taskId: string,
  ): Promise<boolean> {
    await this.findOne(workspaceId, projectId, taskId);
    await this.taskRepository.delete(taskId);
    return true;
  }

  private async ensureProjectBelongsToWorkspace(
    workspaceId: string,
    projectId: string,
  ): Promise<void> {
    const project =
      await this.taskRepository.findProjectByWorkspaceAndId(
        workspaceId,
        projectId,
      );
    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }

  private async validateAssignees(assigneeIds: string[]): Promise<void> {
    if (assigneeIds.length === 0) return;
    const valid = await this.userClientService.validateUserIds(assigneeIds);
    if (!valid) {
      throw new BadRequestException('One or more assignee IDs are invalid');
    }
  }

  private describeChanges(dto: Partial<UpdateTaskDto>): string {
    const parts: string[] = [];
    if (dto.title !== undefined) parts.push(`title → "${dto.title}"`);
    if (dto.description !== undefined) {
      parts.push(
        dto.description
          ? `description → "${dto.description.slice(0, 50)}${dto.description.length > 50 ? '…' : ''}"`
          : 'description cleared',
      );
    }
    if (dto.priority !== undefined) parts.push(`priority → ${dto.priority}`);
    if (dto.deadline !== undefined) {
      parts.push(
        dto.deadline ? `deadline → ${dto.deadline}` : 'deadline cleared',
      );
    }
    if (dto.status !== undefined) parts.push(`status → ${dto.status}`);
    if (dto.tags !== undefined) parts.push(`tags (${dto.tags.length})`);
    if (dto.assignees !== undefined)
      parts.push(`assignees (${dto.assignees.length})`);
    if (parts.length === 0) return 'No changes';
    return parts.join('; ');
  }
}
