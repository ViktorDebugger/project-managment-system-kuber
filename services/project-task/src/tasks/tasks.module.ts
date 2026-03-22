import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TasksController } from './tasks.controller';
import { TaskRepository } from './repositories/task.repository';
import { TasksService } from './tasks.service';
import { UserClientService } from '../clients/user-client.service';
import { WorkspaceClientService } from '../clients/workspace-client.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
    }),
  ],
  controllers: [TasksController],
  providers: [TaskRepository, TasksService, UserClientService, WorkspaceClientService],
  exports: [TasksService],
})
export class TasksModule {}
