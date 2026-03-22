jest.mock('generated/prisma/client', () => ({
  PrismaClient: jest.fn(),
  ParticipantRole: { Admin: 'Admin', Member: 'Member' },
}));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import request from 'supertest';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceMemberGuard } from '../auth/guards/workspace-member.guard';
import { WorkspaceAdminGuard } from '../auth/guards/workspace-admin.guard';
import { PrismaService } from '../prisma/prisma.service';

describe('Workspace guards HTTP (403)', () => {
  let app: INestApplication;
  let workspacesService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    findParticipantByUser: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let prisma: {
    workspace: { findUnique: jest.Mock };
    participant: { findUnique: jest.Mock };
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
    prisma = {
      workspace: { findUnique: jest.fn() },
      participant: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [WorkspacesController],
      providers: [
        { provide: WorkspacesService, useValue: workspacesService },
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .overrideGuard(WorkspaceMemberGuard)
      .useClass(WorkspaceMemberGuard)
      .overrideGuard(WorkspaceAdminGuard)
      .useClass(WorkspaceAdminGuard)
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

  const token = 'Bearer fake-token';

  describe('WorkspaceMemberGuard - 403', () => {
    it('GET /workspaces/ws-1 should return 403 when not a member', async () => {
      prisma.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });
      prisma.participant.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/workspaces/ws-1')
        .set('Authorization', token);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Not a member');
    });

    it('GET /workspaces/ws-1/check-admin should return 403 when not a member', async () => {
      prisma.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });
      prisma.participant.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/workspaces/ws-1/check-admin')
        .set('Authorization', token);

      expect(res.status).toBe(403);
    });
  });

  describe('WorkspaceAdminGuard - 403', () => {
    it('PUT /workspaces/ws-1 should return 403 when member but not admin', async () => {
      prisma.participant.findUnique.mockResolvedValue({
        role: 'Member',
      });

      const res = await request(app.getHttpServer())
        .put('/workspaces/ws-1')
        .set('Authorization', token)
        .send({ name: 'Updated' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('admin');
    });
  });

  describe('WorkspaceMemberGuard - 200 when member', () => {
    it('GET /workspaces/ws-1 should return 200 when member', async () => {
      prisma.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });
      prisma.participant.findUnique.mockResolvedValue({ id: 'p-1' });
      workspacesService.findOne.mockResolvedValue({ id: 'ws-1', name: 'WS' });

      const res = await request(app.getHttpServer())
        .get('/workspaces/ws-1')
        .set('Authorization', token);

      expect(res.status).toBe(200);
    });
  });
});
