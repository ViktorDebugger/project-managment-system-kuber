import { Module } from '@nestjs/common';
import { SprintsController } from './sprints.controller';
import { SprintRepository } from './repositories/sprint.repository';
import { SprintsService } from './sprints.service';

@Module({
  controllers: [SprintsController],
  providers: [SprintRepository, SprintsService],
  exports: [SprintsService],
})
export class SprintsModule {}
