import { Module } from '@nestjs/common';
import { WorkspacesController } from './workspaces.controller';
import { WorkspaceRepository } from './repositories/workspace.repository';
import { WorkspacesService } from './workspaces.service';

@Module({
  controllers: [WorkspacesController],
  providers: [WorkspaceRepository, WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
