jest.mock('generated/prisma/client', () => ({ PrismaClient: jest.fn() }));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceMemberGuard } from '../auth/guards/workspace-member.guard';
import { WorkspaceAdminGuard } from '../auth/guards/workspace-admin.guard';

const passThroughGuard = { canActivate: () => true };

describe('WorkspacesController', () => {
  let app: INestApplication;
  let workspacesService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    findParticipantByUser: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const mockWorkspace = {
    id: 'ws-1',
    name: 'Test Workspace',
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    workspacesService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findParticipantByUser: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkspacesController],
      providers: [{ provide: WorkspacesService, useValue: workspacesService }],
    })
      .overrideGuard(WorkspaceMemberGuard)
      .useValue(passThroughGuard)
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

  describe('GET /workspaces', () => {
    it('should return 200 and paginated data', async () => {
      workspacesService.findAll.mockResolvedValue({
        data: [mockWorkspace],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      const res = await request(app.getHttpServer())
        .get('/workspaces')
        .query({ page: 1, limit: 10 })
        .set(authHeader())
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.page).toBe(1);
    });
  });

  describe('GET /workspaces/:workspaceId/check-admin', () => {
    it('should return 200 and isAdmin', async () => {
      workspacesService.findParticipantByUser.mockResolvedValue({ role: 'Admin' });

      const res = await request(app.getHttpServer())
        .get('/workspaces/ws-1/check-admin')
        .set(authHeader())
        .expect(200);

      expect(res.body).toHaveProperty('isAdmin', true);
    });

    it('should return 200 and isAdmin: false when not admin', async () => {
      workspacesService.findParticipantByUser.mockResolvedValue({ role: 'Member' });

      const res = await request(app.getHttpServer())
        .get('/workspaces/ws-1/check-admin')
        .set(authHeader())
        .expect(200);

      expect(res.body).toHaveProperty('isAdmin', false);
    });
  });

  describe('GET /workspaces/:workspaceId', () => {
    it('should return 200 and workspace', async () => {
      workspacesService.findOne.mockResolvedValue(mockWorkspace);

      const res = await request(app.getHttpServer())
        .get('/workspaces/ws-1')
        .set(authHeader())
        .expect(200);

      expect(res.body).toMatchObject({ id: 'ws-1', name: 'Test Workspace' });
    });

    it('should return 404 when not found', async () => {
      workspacesService.findOne.mockRejectedValue(new NotFoundException('Workspace not found'));

      await request(app.getHttpServer())
        .get('/workspaces/unknown')
        .set(authHeader())
        .expect(404);
    });
  });

  describe('POST /workspaces', () => {
    it('should return 201 and created workspace', async () => {
      workspacesService.create.mockResolvedValue(mockWorkspace);

      const res = await request(app.getHttpServer())
        .post('/workspaces')
        .set(authHeader())
        .send({ name: 'New WS' })
        .expect(201);

      expect(res.body).toHaveProperty('id', 'ws-1');
    });

    it('should return 400 on invalid payload', async () => {
      await request(app.getHttpServer())
        .post('/workspaces')
        .set(authHeader())
        .send({ name: '' })
        .expect(400);
    });
  });

  describe('PUT /workspaces/:workspaceId', () => {
    it('should return 200 and updated workspace', async () => {
      workspacesService.update.mockResolvedValue({ ...mockWorkspace, name: 'Updated' });

      const res = await request(app.getHttpServer())
        .put('/workspaces/ws-1')
        .set(authHeader())
        .send({ name: 'Updated' })
        .expect(200);

      expect(res.body.name).toBe('Updated');
    });
  });

  describe('DELETE /workspaces/:workspaceId', () => {
    it('should return 204', async () => {
      workspacesService.remove.mockResolvedValue(true);

      await request(app.getHttpServer())
        .delete('/workspaces/ws-1')
        .set(authHeader())
        .expect(204);
    });
  });
});
