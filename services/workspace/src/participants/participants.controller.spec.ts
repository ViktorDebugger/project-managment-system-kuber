jest.mock('generated/prisma/client', () => ({
  PrismaClient: jest.fn(),
  ParticipantRole: { Admin: 'Admin', Member: 'Member' },
}));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ParticipantsController } from './participants.controller';
import { ParticipantsService } from './participants.service';
import { WorkspaceAdminGuard } from '../auth/guards/workspace-admin.guard';

const passThroughGuard = { canActivate: () => true };

describe('ParticipantsController', () => {
  let app: INestApplication;
  let participantsService: {
    findAllByWorkspaceId: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const mockParticipant = {
    id: 'p-1',
    userId: '550e8400-e29b-41d4-a716-446655440000',
    workspaceId: 'ws-1',
    role: 'Member',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    participantsService = {
      findAllByWorkspaceId: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParticipantsController],
      providers: [{ provide: ParticipantsService, useValue: participantsService }],
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
  const base = (wsId: string) => `/workspaces/${wsId}/participants`;

  describe('GET /workspaces/:workspaceId/participants', () => {
    it('should return 200 and paginated data', async () => {
      participantsService.findAllByWorkspaceId.mockResolvedValue({
        data: [mockParticipant],
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

  describe('GET /workspaces/:workspaceId/participants/:participantId', () => {
    it('should return 200 and participant', async () => {
      participantsService.findOne.mockResolvedValue(mockParticipant);

      const res = await request(app.getHttpServer())
        .get(`${base('ws-1')}/p-1`)
        .set(authHeader())
        .expect(200);

      expect(res.body).toHaveProperty('id', 'p-1');
    });

    it('should return 404 when not found', async () => {
      participantsService.findOne.mockRejectedValue(new NotFoundException('Participant not found'));

      await request(app.getHttpServer())
        .get(`${base('ws-1')}/unknown`)
        .set(authHeader())
        .expect(404);
    });
  });

  describe('POST /workspaces/:workspaceId/participants', () => {
    it('should return 201 and created participant', async () => {
      participantsService.create.mockResolvedValue(mockParticipant);

      const res = await request(app.getHttpServer())
        .post(base('ws-1'))
        .set(authHeader())
        .send({ userId: '550e8400-e29b-41d4-a716-446655440000', role: 'Member' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id', 'p-1');
    });

    it('should return 400 on invalid payload', async () => {
      await request(app.getHttpServer())
        .post(base('ws-1'))
        .set(authHeader())
        .send({})
        .expect(400);
    });
  });

  describe('PUT /workspaces/:workspaceId/participants/:participantId', () => {
    it('should return 200 and updated participant', async () => {
      participantsService.update.mockResolvedValue({ ...mockParticipant, role: 'Admin' });

      const res = await request(app.getHttpServer())
        .put(`${base('ws-1')}/p-1`)
        .set(authHeader())
        .send({ role: 'Admin' })
        .expect(200);

      expect(res.body.role).toBe('Admin');
    });
  });

  describe('DELETE /workspaces/:workspaceId/participants/:participantId', () => {
    it('should return 204', async () => {
      participantsService.remove.mockResolvedValue(true);

      await request(app.getHttpServer())
        .delete(`${base('ws-1')}/p-1`)
        .set(authHeader())
        .expect(204);
    });
  });
});
