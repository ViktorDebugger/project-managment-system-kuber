import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ParticipantRole } from 'generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkspaceAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub as string | undefined;
    const workspaceId = request.params?.workspaceId as string | undefined;

    if (!userId) {
      throw new ForbiddenException('User not identified');
    }
    if (!workspaceId) {
      throw new ForbiddenException('Workspace context required');
    }

    const participant = await this.prisma.participant.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId },
      },
      select: { role: true },
    });

    if (!participant) {
      throw new ForbiddenException('Not a member of this workspace');
    }
    if (participant.role !== ParticipantRole.Admin) {
      throw new ForbiddenException('Workspace admin role required');
    }

    return true;
  }
}
