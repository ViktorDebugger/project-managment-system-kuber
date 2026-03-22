jest.mock('generated/prisma/client', () => ({ PrismaClient: jest.fn() }));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { SprintsController } from './sprints.controller';
import { SprintsService } from './sprints.service';

describe('SprintsController', () => {
  let app: INestApplication;
  let sprintsService: {
    findAllByProjectId: jest.Mock;
    findOne: jest.Mock;
    findTasksBySprintId: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const mockSprint = {
    id: 'sprint-1',
    projectId: 'proj-1',
    name: 'Sprint 1',
    goal: null,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-14'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    sprintsService = {
      findAllByProjectId: jest.fn(),
      findOne: jest.fn(),
      findTasksBySprintId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SprintsController],
      providers: [{ provide: SprintsService, useValue: sprintsService }],
    }).compile();

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
    `/workspaces/${wsId}/projects/${projId}/sprints`;

  describe('GET /workspaces/:workspaceId/projects/:projectId/sprints', () => {
    it('should return 200 and paginated data', async () => {
      sprintsService.findAllByProjectId.mockResolvedValue({
        data: [mockSprint],
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

  describe('GET /workspaces/:workspaceId/projects/:projectId/sprints/:sprintId/tasks', () => {
    it('should return 200 and tasks', async () => {
      sprintsService.findTasksBySprintId.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get(`${base('ws-1', 'proj-1')}/sprint-1/tasks`)
        .set(authHeader())
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });

  describe('GET /workspaces/:workspaceId/projects/:projectId/sprints/:sprintId', () => {
    it('should return 200 and sprint', async () => {
      sprintsService.findOne.mockResolvedValue(mockSprint);

      const res = await request(app.getHttpServer())
        .get(`${base('ws-1', 'proj-1')}/sprint-1`)
        .set(authHeader())
        .expect(200);

      expect(res.body).toHaveProperty('id', 'sprint-1');
    });

    it('should return 404 when not found', async () => {
      sprintsService.findOne.mockRejectedValue(new NotFoundException('Sprint not found'));

      await request(app.getHttpServer())
        .get(`${base('ws-1', 'proj-1')}/unknown`)
        .set(authHeader())
        .expect(404);
    });
  });

  describe('POST /workspaces/:workspaceId/projects/:projectId/sprints', () => {
    it('should return 201 and created sprint', async () => {
      sprintsService.create.mockResolvedValue(mockSprint);

      const res = await request(app.getHttpServer())
        .post(base('ws-1', 'proj-1'))
        .set(authHeader())
        .send({
          name: 'Sprint 1',
          startDate: '2025-01-01',
          endDate: '2025-01-14',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id', 'sprint-1');
    });

    it('should return 400 on invalid payload', async () => {
      await request(app.getHttpServer())
        .post(base('ws-1', 'proj-1'))
        .set(authHeader())
        .send({ name: '' })
        .expect(400);
    });
  });

  describe('PUT /workspaces/:workspaceId/projects/:projectId/sprints/:sprintId', () => {
    it('should return 200 and updated sprint', async () => {
      sprintsService.update.mockResolvedValue({ ...mockSprint, name: 'Updated' });

      const res = await request(app.getHttpServer())
        .put(`${base('ws-1', 'proj-1')}/sprint-1`)
        .set(authHeader())
        .send({ name: 'Updated' })
        .expect(200);

      expect(res.body.name).toBe('Updated');
    });
  });

  describe('DELETE /workspaces/:workspaceId/projects/:projectId/sprints/:sprintId', () => {
    it('should return 204', async () => {
      sprintsService.remove.mockResolvedValue(true);

      await request(app.getHttpServer())
        .delete(`${base('ws-1', 'proj-1')}/sprint-1`)
        .set(authHeader())
        .expect(204);
    });
  });
});
