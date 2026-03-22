import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WorkspaceAdminGuard implements CanActivate {
  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const workspaceId = request.params?.workspaceId as string | undefined;
    const authHeader = request.headers?.authorization as string | undefined;

    if (!workspaceId) {
      throw new ForbiddenException('Workspace context required');
    }

    const baseUrl = this.config.get<string>('WORKSPACE_SERVICE_URL');
    if (!baseUrl) {
      throw new ForbiddenException('Workspace service not configured');
    }

    const headers = authHeader ? { Authorization: authHeader } : {};
    const url = `${baseUrl}/workspaces/${workspaceId}/check-admin`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<{ isAdmin: boolean }>(url, { headers }),
      );
      if (!response.data?.isAdmin) {
        throw new ForbiddenException('Workspace admin role required');
      }
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'getStatus' in err &&
        typeof (err as { getStatus?: () => number }).getStatus === 'function'
      ) {
        throw err;
      }
      throw new ForbiddenException('Not a member of this workspace');
    }

    return true;
  }
}
