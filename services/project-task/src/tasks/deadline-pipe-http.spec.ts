jest.mock('generated/prisma/client', () => ({ PrismaClient: jest.fn() }));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { DeadlineInSprintPipe } from './pipes/deadline-in-sprint.pipe';
import { PrismaService } from '../prisma/prisma.service';

describe('DeadlineInSprintPipe HTTP (400)', () => {
  let app: INestApplication;
  let tasksService: {
    findAllByProjectId: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let prisma: { sprint: { findUnique: jest.Mock }; task: { findFirst: jest.Mock } };

  beforeEach(async () => {
    tasksService = {
      findAllByProjectId: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    prisma = {
      sprint: { findUnique: jest.fn() },
      task: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        { provide: TasksService, useValue: tasksService },
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .overridePipe(DeadlineInSprintPipe)
      .useClass(DeadlineInSprintPipe)
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.use((req: { headers?: { authorization?: string }; user?: unknown }, _res, next) => {
      const auth = req.headers?.authorization;
      if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
        req.user = { sub: 'user-1' };
      }
      next();
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const base = '/workspaces/ws-1/projects/proj-1/tasks';
  const auth = () => ({ Authorization: 'Bearer token' });

  const validSprintId = '550e8400-e29b-41d4-a716-446655440001';
  const unknownSprintId = '550e8400-e29b-41d4-a716-446655440099';

  it('POST should return 400 when sprint not found', async () => {
    prisma.sprint.findUnique.mockResolvedValue(null);
    tasksService.create.mockResolvedValue({ id: 'task-1' });

    const res = await request(app.getHttpServer())
      .post(base)
      .set(auth())
      .send({
        title: 'Task Title',
        sprintId: unknownSprintId,
        deadline: '2025-01-15',
      });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message).toContain('Sprint not found');
    expect(tasksService.create).not.toHaveBeenCalled();
  });

  it('POST should return 400 when deadline outside sprint range', async () => {
    prisma.sprint.findUnique.mockResolvedValue({
      id: validSprintId,
      startDate: new Date('2025-01-10'),
      endDate: new Date('2025-01-20'),
    });

    const res = await request(app.getHttpServer())
      .post(base)
      .set(auth())
      .send({
        title: 'Task Title',
        sprintId: validSprintId,
        deadline: '2025-01-25',
      });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message).toContain('deadline must be within sprint');
    expect(tasksService.create).not.toHaveBeenCalled();
  });

  it('POST should return 201 when deadline within sprint', async () => {
    prisma.sprint.findUnique.mockResolvedValue({
      id: validSprintId,
      startDate: new Date('2025-01-10'),
      endDate: new Date('2025-01-20'),
    });
    tasksService.create.mockResolvedValue({ id: 'task-1', title: 'Task Title' });

    const res = await request(app.getHttpServer())
      .post(base)
      .set(auth())
      .send({
        title: 'Task Title',
        sprintId: validSprintId,
        deadline: '2025-01-15',
      });

    expect(res.status).toBe(201);
    expect(tasksService.create).toHaveBeenCalled();
  });
});
