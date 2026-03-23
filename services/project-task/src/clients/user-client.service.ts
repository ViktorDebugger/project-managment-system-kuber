import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class UserClientService {
  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  async validateUserIds(ids: string[]): Promise<boolean> {
    if (ids.length === 0) return true;
    const baseUrl = this.config.getOrThrow<string>('USER_SERVICE_URL');
    const url = `${baseUrl}/users/validate-ids?ids=${ids.join(',')}`;
    const response = await firstValueFrom(
      this.httpService.get<{ valid: boolean }>(url),
    );
    return response.data.valid;
  }

  async getUsersByIds(
    ids: string[],
  ): Promise<{ id: string; username: string; email: string; fullname: string }[]> {
    if (ids.length === 0) return [];
    const baseUrl = this.config.getOrThrow<string>('USER_SERVICE_URL');
    const url = `${baseUrl}/users/by-ids?ids=${ids.join(',')}`;
    const response = await firstValueFrom(
      this.httpService.get<{ id: string; username: string; email: string; fullname: string }[]>(
        url,
      ),
    );
    return response.data;
  }
}
