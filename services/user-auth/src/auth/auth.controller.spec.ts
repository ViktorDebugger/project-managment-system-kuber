jest.mock('generated/prisma/client', () => ({ PrismaClient: jest.fn() }));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthController', () => {
  let app: INestApplication;
  let authService: { login: jest.Mock; register: jest.Mock; logout: jest.Mock };
  let usersService: { getProfile: jest.Mock; updateProfile: jest.Mock };

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
    };
    usersService = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
      ],
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

  describe('POST /auth/login', () => {
    it('should return 200 and access_token on valid login', async () => {
      authService.login.mockResolvedValue({ access_token: 'jwt-token' });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'password123' })
        .expect(200);

      expect(res.body).toHaveProperty('access_token', 'jwt-token');
      expect(authService.login).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@example.com',
          password: 'password123',
        }),
      );
    });

    it('should return 400 on invalid payload', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'invalid', password: 'short' })
        .expect(400);

      expect(authService.login).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/register', () => {
    it('should return 201 and access_token on successful registration', async () => {
      authService.register.mockResolvedValue({ access_token: 'jwt-token' });

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'john',
          email: 'john@example.com',
          fullname: 'John Doe',
          password: 'password123',
        })
        .expect(201);

      expect(res.body).toHaveProperty('access_token', 'jwt-token');
    });

    it('should return 400 on invalid payload', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: '',
          email: 'invalid',
          fullname: '',
          password: 'short',
        })
        .expect(400);

      expect(authService.register).not.toHaveBeenCalled();
    });
  });

  describe('GET /auth', () => {
    it('should return 200 and profile when authenticated', async () => {
      usersService.getProfile.mockResolvedValue({
        id: 'test-user-id',
        username: 'john',
        email: 'john@example.com',
      });

      const res = await request(app.getHttpServer())
        .get('/auth')
        .set('Authorization', 'Bearer any-token')
        .expect(200);

      expect(res.body).toMatchObject({
        id: 'test-user-id',
        username: 'john',
        email: 'john@example.com',
      });
      expect(usersService.getProfile).toHaveBeenCalledWith('test-user-id');
    });

    it('should return 404 when user not found', async () => {
      usersService.getProfile.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/auth')
        .set('Authorization', 'Bearer any-token')
        .expect(404);
    });
  });

  describe('PUT /auth/profile', () => {
    it('should return 200 and updated profile', async () => {
      usersService.updateProfile.mockResolvedValue({
        id: 'test-user-id',
        fullname: 'Updated Name',
      });

      const res = await request(app.getHttpServer())
        .put('/auth/profile')
        .set('Authorization', 'Bearer any-token')
        .send({ fullname: 'Updated Name' })
        .expect(200);

      expect(res.body).toHaveProperty('fullname', 'Updated Name');
    });

    it('should return 404 when user not authenticated', async () => {
      await request(app.getHttpServer())
        .put('/auth/profile')
        .send({ fullname: 'X' })
        .expect(404);
    });
  });

  describe('POST /auth/logout', () => {
    it('should return 200 and message', async () => {
      authService.logout.mockReturnValue({ message: 'Logged out successfully' });

      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer any-token')
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Logged out successfully');
    });
  });
});
