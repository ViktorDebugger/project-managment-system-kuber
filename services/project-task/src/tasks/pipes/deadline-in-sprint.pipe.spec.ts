jest.mock('generated/prisma/client', () => ({ PrismaClient: jest.fn() }));
jest.mock('../../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DeadlineInSprintPipe } from './deadline-in-sprint.pipe';
import { PrismaService } from '../../prisma/prisma.service';

describe('DeadlineInSprintPipe', () => {
  let pipe: DeadlineInSprintPipe;
  let prisma: { sprint: { findUnique: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      sprint: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeadlineInSprintPipe,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    pipe = module.get<DeadlineInSprintPipe>(DeadlineInSprintPipe);
  });

  it('should return value as-is when no sprintId', async () => {
    const value = { title: 'Task', deadline: '2025-01-15' };

    const result = await pipe.transform(value);

    expect(result).toBe(value);
    expect(prisma.sprint.findUnique).not.toHaveBeenCalled();
  });

  it('should return value as-is when no deadline', async () => {
    const value = { title: 'Task', sprintId: 'sprint-1' };

    const result = await pipe.transform(value);

    expect(result).toBe(value);
    expect(prisma.sprint.findUnique).not.toHaveBeenCalled();
  });

  it('should return value as-is when neither sprintId nor deadline', async () => {
    const value = { title: 'Task' };

    const result = await pipe.transform(value);

    expect(result).toBe(value);
    expect(prisma.sprint.findUnique).not.toHaveBeenCalled();
  });

  it('should throw 400 when sprint not found', async () => {
    prisma.sprint.findUnique.mockResolvedValue(null);

    const value = {
      title: 'Task',
      sprintId: 'unknown-sprint',
      deadline: '2025-01-15',
    };

    await expect(pipe.transform(value)).rejects.toThrow(BadRequestException);
    await expect(pipe.transform(value)).rejects.toThrow('Sprint not found');
  });

  it('should throw 400 when deadline before sprint start', async () => {
    prisma.sprint.findUnique.mockResolvedValue({
      id: 'sprint-1',
      startDate: new Date('2025-01-10'),
      endDate: new Date('2025-01-20'),
    });

    const value = {
      title: 'Task',
      sprintId: 'sprint-1',
      deadline: '2025-01-05',
    };

    await expect(pipe.transform(value)).rejects.toThrow(BadRequestException);
    await expect(pipe.transform(value)).rejects.toThrow(
      'Task deadline must be within sprint start and end dates',
    );
  });

  it('should throw 400 when deadline after sprint end', async () => {
    prisma.sprint.findUnique.mockResolvedValue({
      id: 'sprint-1',
      startDate: new Date('2025-01-10'),
      endDate: new Date('2025-01-20'),
    });

    const value = {
      title: 'Task',
      sprintId: 'sprint-1',
      deadline: '2025-01-25',
    };

    await expect(pipe.transform(value)).rejects.toThrow(BadRequestException);
    await expect(pipe.transform(value)).rejects.toThrow(
      'Task deadline must be within sprint start and end dates',
    );
  });

  it('should return value when deadline within sprint range', async () => {
    prisma.sprint.findUnique.mockResolvedValue({
      id: 'sprint-1',
      startDate: new Date('2025-01-10'),
      endDate: new Date('2025-01-20'),
    });

    const value = {
      title: 'Task',
      sprintId: 'sprint-1',
      deadline: '2025-01-15',
    };

    const result = await pipe.transform(value);

    expect(result).toBe(value);
    expect(prisma.sprint.findUnique).toHaveBeenCalledWith({
      where: { id: 'sprint-1' },
    });
  });
});
