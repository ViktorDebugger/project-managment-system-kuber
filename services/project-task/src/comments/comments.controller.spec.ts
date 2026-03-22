jest.mock('generated/prisma/client', () => ({ PrismaClient: jest.fn() }));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

describe('CommentsController', () => {
  let app: INestApplication;
  let commentsService: {
    findAllByTaskId: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const mockComment = {
    id: 'comm-1',
    taskId: 'task-1',
    content: 'Test comment',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    commentsService = {
      findAllByTaskId: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [{ provide: CommentsService, useValue: commentsService }],
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
  const base = (wsId: string, projId: string, taskId: string) =>
    `/workspaces/${wsId}/projects/${projId}/tasks/${taskId}/comments`;

  describe('GET /workspaces/.../tasks/:taskId/comments', () => {
    it('should return 200 and paginated data', async () => {
      commentsService.findAllByTaskId.mockResolvedValue({
        data: [mockComment],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      const res = await request(app.getHttpServer())
        .get(base('ws-1', 'proj-1', 'task-1'))
        .query({ page: 1, limit: 10 })
        .set(authHeader())
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });
  });

  describe('GET /workspaces/.../tasks/:taskId/comments/:commentId', () => {
    it('should return 200 and comment', async () => {
      commentsService.findOne.mockResolvedValue(mockComment);

      const res = await request(app.getHttpServer())
        .get(`${base('ws-1', 'proj-1', 'task-1')}/comm-1`)
        .set(authHeader())
        .expect(200);

      expect(res.body).toHaveProperty('id', 'comm-1');
    });

    it('should return 404 when not found', async () => {
      commentsService.findOne.mockRejectedValue(new NotFoundException('Comment not found'));

      await request(app.getHttpServer())
        .get(`${base('ws-1', 'proj-1', 'task-1')}/unknown`)
        .set(authHeader())
        .expect(404);
    });
  });

  describe('POST /workspaces/.../tasks/:taskId/comments', () => {
    it('should return 201 and created comment', async () => {
      commentsService.create.mockResolvedValue(mockComment);

      const res = await request(app.getHttpServer())
        .post(base('ws-1', 'proj-1', 'task-1'))
        .set(authHeader())
        .send({ content: 'New comment' })
        .expect(201);

      expect(res.body).toHaveProperty('id', 'comm-1');
    });

    it('should return 400 on invalid payload', async () => {
      await request(app.getHttpServer())
        .post(base('ws-1', 'proj-1', 'task-1'))
        .set(authHeader())
        .send({})
        .expect(400);
    });
  });

  describe('PUT /workspaces/.../tasks/:taskId/comments/:commentId', () => {
    it('should return 200 and updated comment', async () => {
      commentsService.update.mockResolvedValue({
        ...mockComment,
        content: 'Updated',
      });

      const res = await request(app.getHttpServer())
        .put(`${base('ws-1', 'proj-1', 'task-1')}/comm-1`)
        .set(authHeader())
        .send({ content: 'Updated' })
        .expect(200);

      expect(res.body.content).toBe('Updated');
    });
  });

  describe('DELETE /workspaces/.../tasks/:taskId/comments/:commentId', () => {
    it('should return 204', async () => {
      commentsService.remove.mockResolvedValue(true);

      await request(app.getHttpServer())
        .delete(`${base('ws-1', 'proj-1', 'task-1')}/comm-1`)
        .set(authHeader())
        .expect(204);
    });
  });
});
