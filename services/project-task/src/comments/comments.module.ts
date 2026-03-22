import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentRepository } from './repositories/comment.repository';
import { CommentsService } from './comments.service';

@Module({
  controllers: [CommentsController],
  providers: [CommentRepository, CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
