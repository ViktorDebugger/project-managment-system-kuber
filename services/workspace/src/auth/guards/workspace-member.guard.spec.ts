jest.mock('generated/prisma/client', () => ({ PrismaClient: jest.fn() }));
jest.mock('../../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceMemberGuard } from './workspace-member.guard';
import { PrismaService } from '../../prisma/prisma.service';

describe('WorkspaceMemberGuard', () => {
  let guard: WorkspaceMemberGuard;
  let prisma: {
    workspace: { findUnique: jest.Mock };
    participant: { findUnique: jest.Mock };
  };

  const createMockContext = (overrides: {
    user?: { sub?: string };
    params?: Record<string, string>;
  } = {}): ExecutionContext => {
    const request = {
      user: overrides.user,
      params: overrides.params ?? {},
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    prisma = {
      workspace: { findUnique: jest.fn() },
      participant: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceMemberGuard,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    guard = module.get<WorkspaceMemberGuard>(WorkspaceMemberGuard);
  });

  it('should throw 403 when user not identified', async () => {
    const context = createMockContext({
      params: { workspaceId: 'ws-1' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow('User not identified');
    expect(prisma.participant.findUnique).not.toHaveBeenCalled();
  });

  it('should throw 403 when workspaceId missing', async () => {
    const context = createMockContext({
      user: { sub: 'user-1' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Workspace context required',
    );
    expect(prisma.participant.findUnique).not.toHaveBeenCalled();
  });

  it('should throw 404 when workspace does not exist', async () => {
    prisma.workspace.findUnique.mockResolvedValue(null);

    const context = createMockContext({
      user: { sub: 'user-1' },
      params: { workspaceId: 'ws-1' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Workspace not found',
    );
    expect(prisma.participant.findUnique).not.toHaveBeenCalled();
  });

  it('should throw 403 when not a member of workspace', async () => {
    prisma.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });
    prisma.participant.findUnique.mockResolvedValue(null);

    const context = createMockContext({
      user: { sub: 'user-1' },
      params: { workspaceId: 'ws-1' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Not a member of this workspace',
    );
  });

  it('should return true when user is member', async () => {
    prisma.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });
    prisma.participant.findUnique.mockResolvedValue({ id: 'p-1' });

    const context = createMockContext({
      user: { sub: 'user-1' },
      params: { workspaceId: 'ws-1' },
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(prisma.workspace.findUnique).toHaveBeenCalledWith({
      where: { id: 'ws-1' },
      select: { id: true },
    });
    expect(prisma.participant.findUnique).toHaveBeenCalledWith({
      where: { userId_workspaceId: { userId: 'user-1', workspaceId: 'ws-1' } },
      select: { id: true },
    });
  });
});
