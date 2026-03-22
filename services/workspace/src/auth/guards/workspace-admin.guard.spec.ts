jest.mock('generated/prisma/client', () => ({
  PrismaClient: jest.fn(),
  ParticipantRole: { Admin: 'Admin', Member: 'Member' },
}));
jest.mock('../../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceAdminGuard } from './workspace-admin.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ParticipantRole } from 'generated/prisma/client';

describe('WorkspaceAdminGuard', () => {
  let guard: WorkspaceAdminGuard;
  let prisma: { participant: { findUnique: jest.Mock } };

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
      participant: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceAdminGuard,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    guard = module.get<WorkspaceAdminGuard>(WorkspaceAdminGuard);
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

  it('should throw 403 when not a member of workspace', async () => {
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

  it('should throw 403 when member but not admin', async () => {
    prisma.participant.findUnique.mockResolvedValue({
      role: ParticipantRole.Member,
    });

    const context = createMockContext({
      user: { sub: 'user-1' },
      params: { workspaceId: 'ws-1' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Workspace admin role required',
    );
  });

  it('should return true when user is admin', async () => {
    prisma.participant.findUnique.mockResolvedValue({
      role: ParticipantRole.Admin,
    });

    const context = createMockContext({
      user: { sub: 'user-1' },
      params: { workspaceId: 'ws-1' },
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(prisma.participant.findUnique).toHaveBeenCalledWith({
      where: { userId_workspaceId: { userId: 'user-1', workspaceId: 'ws-1' } },
      select: { role: true },
    });
  });
});
