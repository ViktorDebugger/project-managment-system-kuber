jest.mock('generated/prisma/client', () => ({ PrismaClient: jest.fn() }));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { WorkspaceAdminGuard } from '../auth/guards/workspace-admin.guard';

const passThroughGuard = { canActivate: () => true };

describe('TagsController', () => {
  let app: INestApplication;
  let tagsService: {
    findAllByWorkspace: jest.Mock;
    resolveOrCreate: jest.Mock;
    delete: jest.Mock;
  };

  const mockTag = {
    id: 'tag-1',
    name: 'urgent',
    workspaceId: 'ws-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    tagsService = {
      findAllByWorkspace: jest.fn(),
      resolveOrCreate: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagsController],
      providers: [{ provide: TagsService, useValue: tagsService }],
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
  const base = (wsId: string) => `/workspaces/${wsId}/tags`;

  describe('POST /workspaces/:workspaceId/tags/resolve-or-create', () => {
    it('should return 200 and tagIds', async () => {
      tagsService.resolveOrCreate.mockResolvedValue({ tagIds: ['tag-1', 'tag-2'] });

      const res = await request(app.getHttpServer())
        .post(`${base('ws-1')}/resolve-or-create`)
        .set(authHeader())
        .send({ names: ['urgent', 'bug'] })
        .expect(200);

      expect(res.body).toHaveProperty('tagIds');
      expect(res.body.tagIds).toEqual(['tag-1', 'tag-2']);
    });
  });

  describe('GET /workspaces/:workspaceId/tags', () => {
    it('should return 200 and paginated data', async () => {
      tagsService.findAllByWorkspace.mockResolvedValue({
        data: [mockTag],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      const res = await request(app.getHttpServer())
        .get(base('ws-1'))
        .query({ page: 1, limit: 10 })
        .set(authHeader())
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });
  });

  describe('DELETE /workspaces/:workspaceId/tags/:tagId', () => {
    it('should return 204', async () => {
      tagsService.delete.mockResolvedValue(true);

      await request(app.getHttpServer())
        .delete(`${base('ws-1')}/tag-1`)
        .set(authHeader())
        .expect(204);
    });

    it('should return 404 when tag not found', async () => {
      tagsService.delete.mockRejectedValue(new NotFoundException('Tag not found'));

      await request(app.getHttpServer())
        .delete(`${base('ws-1')}/unknown`)
        .set(authHeader())
        .expect(404);
    });
  });
});
