import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProjectsController } from './projects.controller';
import { ProjectRepository } from './repositories/project.repository';
import { ProjectsService } from './projects.service';
import { WorkspaceClientService } from '../clients/workspace-client.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
    }),
  ],
  controllers: [ProjectsController],
  providers: [ProjectRepository, ProjectsService, WorkspaceClientService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
