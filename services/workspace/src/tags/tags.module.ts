import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { TagRepository } from './repositories/tag.repository';
import { TagsService } from './tags.service';

@Module({
  controllers: [TagsController],
  providers: [TagRepository, TagsService],
  exports: [TagsService],
})
export class TagsModule {}
