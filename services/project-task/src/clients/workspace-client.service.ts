import { Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WorkspaceClientService {
  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  async ensureWorkspaceExists(
    workspaceId: string,
    authHeader?: string,
  ): Promise<void> {
    const baseUrl = this.config.getOrThrow<string>('WORKSPACE_SERVICE_URL');
    const url = `${baseUrl}/workspaces/${workspaceId}`;
    const headers = authHeader ? { Authorization: authHeader } : {};
    try {
      await firstValueFrom(this.httpService.get(url, { headers }));
    } catch (err: unknown) {
      const status =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      if (status === 404 || status === 401) {
        throw new NotFoundException('Workspace not found');
      }
      throw err;
    }
  }

  async resolveOrCreateTags(
    workspaceId: string,
    names: string[],
    authHeader?: string,
  ): Promise<string[]> {
    if (names.length === 0) return [];
    const baseUrl = this.config.getOrThrow<string>('WORKSPACE_SERVICE_URL');
    const url = `${baseUrl}/workspaces/${workspaceId}/tags/resolve-or-create`;
    const headers = authHeader ? { Authorization: authHeader } : {};
    const response = await firstValueFrom(
      this.httpService.post<{ tagIds: string[] }>(url, { names }, { headers }),
    );
    return response.data.tagIds;
  }
}
