jest.mock('generated/prisma/client', () => ({ PrismaClient: jest.fn() }));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let app: INestApplication;
  let usersService: { validateUserIds: jest.Mock };

  beforeEach(async () => {
    usersService = { validateUserIds: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /users/validate-ids', () => {
    it('should return 200 and valid: true when all ids valid', async () => {
      usersService.validateUserIds.mockResolvedValue(true);

      const res = await request(app.getHttpServer())
        .get('/users/validate-ids')
        .query({ ids: 'id1,id2' })
        .expect(200);

      expect(res.body).toEqual({ valid: true });
      expect(usersService.validateUserIds).toHaveBeenCalledWith(['id1', 'id2']);
    });

    it('should return 200 and valid: false when ids invalid', async () => {
      usersService.validateUserIds.mockResolvedValue(false);

      const res = await request(app.getHttpServer())
        .get('/users/validate-ids')
        .query({ ids: 'invalid' })
        .expect(200);

      expect(res.body).toEqual({ valid: false });
    });

    it('should return 200 and valid: false when ids empty', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/validate-ids')
        .query({ ids: '' })
        .expect(200);

      expect(res.body).toEqual({ valid: false });
      expect(usersService.validateUserIds).not.toHaveBeenCalled();
    });
  });
});
