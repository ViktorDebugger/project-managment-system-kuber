jest.mock('generated/prisma/client', () => ({ PrismaClient: jest.fn() }));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { DeadlineInSprintPipe } from './pipes/deadline-in-sprint.pipe';

describe('TasksController', () => {
  let app: INestApplication;
  let tasksService: {
    findAllByProjectId: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const mockTask = {
    id: 'task-1',
    projectId: 'proj-1',
    title: 'Test Task',
    status: 'TODO',
    priority: 'MEDIUM',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const identityPipe = {
    transform: (value: unknown) => value,
  };

  beforeEach(async () => {
    tasksService = {
      findAllByProjectId: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: tasksService }],
    })
      .overridePipe(DeadlineInSprintPipe)
      .useValue(identityPipe)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.use((req: { headers?: { authorization?: string }; user?: unknown }, _res, next) => {
      const auth = req.headers?.authorization;
      if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
        req.user = { sub: 'test-user-id' };
      }
      next();
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const authHeader = () => ({ Authorization: 'Bearer token' });
  const base = (wsId: string, projId: string) =>
    `/workspaces/${wsId}/projects/${projId}/tasks`;

  describe('GET /workspaces/:workspaceId/projects/:projectId/tasks', () => {
    it('should return 200 and paginated data', async () => {
      tasksService.findAllByProjectId.mockResolvedValue({
        data: [mockTask],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      const res = await request(app.getHttpServer())
        .get(base('ws-1', 'proj-1'))
        .query({ page: 1, limit: 10 })
        .set(authHeader())
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });
  });

  describe('GET /workspaces/:workspaceId/projects/:projectId/tasks/:taskId', () => {
    it('should return 200 and task', async () => {
      tasksService.findOne.mockResolvedValue(mockTask);

      const res = await request(app.getHttpServer())
        .get(`${base('ws-1', 'proj-1')}/task-1`)
        .set(authHeader())
        .expect(200);

      expect(res.body).toHaveProperty('id', 'task-1');
    });

    it('should return 404 when not found', async () => {
      tasksService.findOne.mockRejectedValue(new NotFoundException('Task not found'));

      await request(app.getHttpServer())
        .get(`${base('ws-1', 'proj-1')}/unknown`)
        .set(authHeader())
        .expect(404);
    });
  });

  describe('POST /workspaces/:workspaceId/projects/:projectId/tasks', () => {
    it('should return 201 and created task', async () => {
      tasksService.create.mockResolvedValue(mockTask);

      const res = await request(app.getHttpServer())
        .post(base('ws-1', 'proj-1'))
        .set(authHeader())
        .send({ title: 'New Task Title' })
        .expect(201);

      expect(res.body).toHaveProperty('id', 'task-1');
    });

    it('should return 400 on invalid payload', async () => {
      await request(app.getHttpServer())
        .post(base('ws-1', 'proj-1'))
        .set(authHeader())
        .send({ title: 'ab' })
        .expect(400);
    });
  });

  describe('PUT /workspaces/:workspaceId/projects/:projectId/tasks/:taskId', () => {
    it('should return 200 and updated task', async () => {
      tasksService.update.mockResolvedValue({ ...mockTask, title: 'Updated' });

      const res = await request(app.getHttpServer())
        .put(`${base('ws-1', 'proj-1')}/task-1`)
        .set(authHeader())
        .send({ title: 'Updated' })
        .expect(200);

      expect(res.body.title).toBe('Updated');
    });
  });

  describe('DELETE /workspaces/:workspaceId/projects/:projectId/tasks/:taskId', () => {
    it('should return 204', async () => {
      tasksService.remove.mockResolvedValue(true);

      await request(app.getHttpServer())
        .delete(`${base('ws-1', 'proj-1')}/task-1`)
        .set(authHeader())
        .expect(204);
    });
  });
});
