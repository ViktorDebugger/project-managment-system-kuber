jest.mock('generated/prisma/client', () => ({ PrismaClient: jest.fn() }));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { WorkspaceAdminGuard } from '../auth/guards/workspace-admin.guard';

const passThroughGuard = { canActivate: () => true };

describe('ProjectsController', () => {
  let app: INestApplication;
  let projectsService: {
    findAllByWorkspaceId: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const mockProject = {
    id: 'proj-1',
    workspaceId: 'ws-1',
    name: 'Test Project',
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    projectsService = {
      findAllByWorkspaceId: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: projectsService }],
    })
      .overrideGuard(WorkspaceAdminGuard)
      .useValue(passThroughGuard)
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
  const base = (wsId: string) => `/workspaces/${wsId}/projects`;

  describe('GET /workspaces/:workspaceId/projects', () => {
    it('should return 200 and paginated data', async () => {
      projectsService.findAllByWorkspaceId.mockResolvedValue({
        data: [mockProject],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      const res = await request(app.getHttpServer())
        .get(base('ws-1'))
        .query({ page: 1, limit: 10 })
        .set(authHeader())
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /workspaces/:workspaceId/projects/:projectId', () => {
    it('should return 200 and project', async () => {
      projectsService.findOne.mockResolvedValue(mockProject);

      const res = await request(app.getHttpServer())
        .get(`${base('ws-1')}/proj-1`)
        .set(authHeader())
        .expect(200);

      expect(res.body).toHaveProperty('id', 'proj-1');
    });

    it('should return 404 when not found', async () => {
      projectsService.findOne.mockRejectedValue(new NotFoundException('Project not found'));

      await request(app.getHttpServer())
        .get(`${base('ws-1')}/unknown`)
        .set(authHeader())
        .expect(404);
    });
  });

  describe('POST /workspaces/:workspaceId/projects', () => {
    it('should return 201 and created project', async () => {
      projectsService.create.mockResolvedValue(mockProject);

      const res = await request(app.getHttpServer())
        .post(base('ws-1'))
        .set(authHeader())
        .send({ name: 'New Project' })
        .expect(201);

      expect(res.body).toHaveProperty('id', 'proj-1');
    });

    it('should return 400 on invalid payload', async () => {
      await request(app.getHttpServer())
        .post(base('ws-1'))
        .set(authHeader())
        .send({ name: '' })
        .expect(400);
    });
  });

  describe('PUT /workspaces/:workspaceId/projects/:projectId', () => {
    it('should return 200 and updated project', async () => {
      projectsService.update.mockResolvedValue({ ...mockProject, name: 'Updated' });

      const res = await request(app.getHttpServer())
        .put(`${base('ws-1')}/proj-1`)
        .set(authHeader())
        .send({ name: 'Updated' })
        .expect(200);

      expect(res.body.name).toBe('Updated');
    });
  });

  describe('DELETE /workspaces/:workspaceId/projects/:projectId', () => {
    it('should return 204', async () => {
      projectsService.remove.mockResolvedValue(true);

      await request(app.getHttpServer())
        .delete(`${base('ws-1')}/proj-1`)
        .set(authHeader())
        .expect(204);
    });
  });
});
