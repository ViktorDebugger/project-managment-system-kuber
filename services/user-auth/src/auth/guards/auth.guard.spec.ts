import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };

  const createMockContext = (overrides: {
    authorization?: string;
    user?: unknown;
  } = {}): ExecutionContext => {
    const request = {
      headers: overrides.authorization
        ? { authorization: overrides.authorization }
        : {},
      user: overrides.user,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    jwtService = { verifyAsync: jest.fn() };
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: JwtService, useValue: jwtService },
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
  });

  describe('public routes', () => {
    it('should allow access without token when route is public', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const context = createMockContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });
  });

  describe('private routes', () => {
    it('should throw 401 when no Authorization header', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      const context = createMockContext();

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should throw 401 when Authorization is not Bearer', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      const context = createMockContext({
        authorization: 'Basic base64string',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should throw 401 when token is invalid or expired', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      const context = createMockContext({
        authorization: 'Bearer invalid-token',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should allow access and set req.user when token is valid', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const payload = { sub: 'user-1', username: 'john' };
      jwtService.verifyAsync.mockResolvedValue(payload);

      const context = createMockContext({
        authorization: 'Bearer valid-token',
      });
      const request = context.switchToHttp().getRequest();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.user).toEqual(payload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
    });
  });
});
