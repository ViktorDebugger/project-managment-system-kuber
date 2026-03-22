import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get('validate-ids')
  @ApiQuery({ name: 'ids', required: true, description: 'Comma-separated user IDs' })
  async validateIds(
    @Query('ids') ids: string,
  ): Promise<{ valid: boolean }> {
    const idList = ids?.split(',').map((id) => id.trim()).filter(Boolean) ?? [];
    if (idList.length === 0) {
      return { valid: false };
    }
    const valid = await this.usersService.validateUserIds(idList);
    return { valid };
  }
}
