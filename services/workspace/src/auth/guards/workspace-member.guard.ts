import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
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

    const workspaceExists = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    });
    if (!workspaceExists) {
      throw new NotFoundException('Workspace not found');
    }

    const participant = await this.prisma.participant.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId },
      },
      select: { id: true },
    });

    if (!participant) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    return true;
  }
}
