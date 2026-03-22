import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';

@Injectable()
export class DeadlineInSprintPipe
  implements PipeTransform<CreateTaskDto | Partial<UpdateTaskDto>, Promise<CreateTaskDto | Partial<UpdateTaskDto>>>
{
  constructor(private readonly prisma: PrismaService) {}

  async transform(
    value: CreateTaskDto | Partial<UpdateTaskDto>,
  ): Promise<CreateTaskDto | Partial<UpdateTaskDto>> {
    const sprintId = value.sprintId;
    const deadline = value.deadline;
    if (!sprintId || !deadline) return value;

    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
    });
    if (!sprint) {
      throw new BadRequestException('Sprint not found');
    }
    const d = new Date(deadline);
    if (d < sprint.startDate || d > sprint.endDate) {
      throw new BadRequestException(
        'Task deadline must be within sprint start and end dates',
      );
    }
    return value;
  }
}
