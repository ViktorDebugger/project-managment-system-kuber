jest.mock('generated/prisma/client', () => ({ PrismaClient: jest.fn() }));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { AuthGuard } from './guards/auth.guard';
import { APP_GUARD } from '@nestjs/core';

describe('AuthGuard HTTP (public/private routes)', () => {
  let app: INestApplication;
  let authService: { login: jest.Mock; register: jest.Mock; logout: jest.Mock };
  let usersService: { getProfile: jest.Mock };
  let jwtService: JwtService;

  beforeEach(async () => {
    authService = {
      login: jest.fn().mockResolvedValue({ access_token: 'token' }),
      register: jest.fn().mockResolvedValue({ access_token: 'token' }),
      logout: jest.fn().mockReturnValue({ message: 'ok' }),
    };
    usersService = { getProfile: jest.fn().mockResolvedValue({ id: 'u1' }) };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
        {
          provide: APP_GUARD,
          useClass: AuthGuard,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('public routes', () => {
    it('POST /auth/login should return 200 without Authorization', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'u@e.com', password: 'password123' })
        .expect(200);
    });

    it('POST /auth/register should return 201 without Authorization', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'u',
          email: 'u@e.com',
          fullname: 'U',
          password: 'password123',
        })
        .expect(201);
    });
  });

  describe('private routes - 401', () => {
    it('GET /auth should return 401 without Authorization', async () => {
      const res = await request(app.getHttpServer()).get('/auth');

      expect(res.status).toBe(401);
    });

    it('GET /auth should return 401 with invalid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });

    it('PUT /auth/profile should return 401 without Authorization', async () => {
      const res = await request(app.getHttpServer())
        .put('/auth/profile')
        .send({ fullname: 'X' });

      expect(res.status).toBe(401);
    });

    it('POST /auth/logout should return 401 without Authorization', async () => {
      const res = await request(app.getHttpServer()).post('/auth/logout');

      expect(res.status).toBe(401);
    });
  });

  describe('private routes - 200 with valid token', () => {
    it('GET /auth should return 200 with valid token', async () => {
      const token = await jwtService.signAsync({ sub: 'u1', username: 'u' });

      const res = await request(app.getHttpServer())
        .get('/auth')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('POST /auth/logout should return 200 with valid token', async () => {
      const token = await jwtService.signAsync({ sub: 'u1', username: 'u' });

      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });
});
