import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ParticipantsController } from './participants.controller';
import { ParticipantRepository } from './repositories/participant.repository';
import { ParticipantsService } from './participants.service';
import { UserClientService } from '../users/user-client.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
    }),
  ],
  controllers: [ParticipantsController],
  providers: [ParticipantRepository, ParticipantsService, UserClientService],
  exports: [ParticipantsService],
})
export class ParticipantsModule {}
