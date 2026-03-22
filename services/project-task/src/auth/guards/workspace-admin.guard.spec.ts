import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { WorkspaceAdminGuard } from './workspace-admin.guard';

describe('WorkspaceAdminGuard (project-task)', () => {
  let guard: WorkspaceAdminGuard;
  let httpService: { get: jest.Mock };
  let configService: { get: jest.Mock };

  const createMockContext = (overrides: {
    headers?: { authorization?: string };
    params?: Record<string, string>;
  } = {}): ExecutionContext => {
    const request = {
      headers: overrides.headers ?? {},
      params: overrides.params ?? {},
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    httpService = { get: jest.fn() };
    configService = { get: jest.fn().mockReturnValue('http://workspace:3002') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceAdminGuard,
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    guard = module.get<WorkspaceAdminGuard>(WorkspaceAdminGuard);
  });

  it('should throw 403 when workspaceId missing', async () => {
    const context = createMockContext({
      headers: { authorization: 'Bearer token' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Workspace context required',
    );
    expect(httpService.get).not.toHaveBeenCalled();
  });

  it('should throw 403 when WORKSPACE_SERVICE_URL not configured', async () => {
    configService.get.mockReturnValue(undefined);

    const context = createMockContext({
      params: { workspaceId: 'ws-1' },
      headers: { authorization: 'Bearer token' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Workspace service not configured',
    );
  });

  it('should throw 403 when API returns isAdmin: false', async () => {
    httpService.get.mockReturnValue(of({ data: { isAdmin: false } }));

    const context = createMockContext({
      params: { workspaceId: 'ws-1' },
      headers: { authorization: 'Bearer token' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Workspace admin role required',
    );
  });

  it('should throw 403 when API request fails (not a member)', async () => {
    httpService.get.mockReturnValue(throwError(() => new Error('404')));

    const context = createMockContext({
      params: { workspaceId: 'ws-1' },
      headers: { authorization: 'Bearer token' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Not a member of this workspace',
    );
  });

  it('should rethrow ForbiddenException from API error', async () => {
    const forbidden = new ForbiddenException('Custom');
    (forbidden as { getStatus?: () => number }).getStatus = () => 403;
    httpService.get.mockReturnValue(throwError(() => forbidden));

    const context = createMockContext({
      params: { workspaceId: 'ws-1' },
      headers: { authorization: 'Bearer token' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow('Custom');
  });

  it('should return true when API returns isAdmin: true', async () => {
    httpService.get.mockReturnValue(of({ data: { isAdmin: true } }));

    const context = createMockContext({
      params: { workspaceId: 'ws-1' },
      headers: { authorization: 'Bearer token' },
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(httpService.get).toHaveBeenCalledWith(
      'http://workspace:3002/workspaces/ws-1/check-admin',
      { headers: { Authorization: 'Bearer token' } },
    );
  });
});
