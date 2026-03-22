import {
  BadGatewayException,
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

const SKIP_FORWARD_HEADERS = new Set([
  'transfer-encoding',
  'content-encoding',
  'connection',
  'keep-alive',
  'access-control-allow-origin',
  'access-control-allow-credentials',
  'access-control-allow-methods',
  'access-control-allow-headers',
  'access-control-expose-headers',
  'access-control-max-age',
]);

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const path = (req.originalUrl ?? req.url ?? req.path).split('?')[0];
    const method = req.method;

    const publicPaths = ['/auth/login', '/auth/register'];
    if (!publicPaths.includes(path)) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new UnauthorizedException());
      }
      const token = authHeader.split(' ')[1];
      try {
        this.jwtService.verify(token);
      } catch {
        return next(new UnauthorizedException());
      }
    }

    const target = this.getTargetBaseUrl(path);
    if (!target) {
      return next(new BadGatewayException('No target service configured'));
    }

    const url = `${target}${req.originalUrl}`;
    const headers = { ...req.headers } as Record<string, string>;
    delete headers.host;

    try {
      const response = await axios({
        method: method as string,
        url,
        headers,
        data: req.body,
        validateStatus: () => true,
        timeout: 30000,
      });

      res.status(response.status);
      Object.entries(response.headers).forEach(([key, value]) => {
        const lower = key.toLowerCase();
        if (
          !SKIP_FORWARD_HEADERS.has(lower) &&
          typeof value === 'string'
        ) {
          res.setHeader(key, value);
        }
      });
      res.send(response.data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        res.status(err.response.status).send(err.response.data);
      } else {
        const status = 502;
        const body = {
          statusCode: status,
          error: 'Bad Gateway',
          message: 'Backend service unavailable',
        };
        res.status(status).json(body);
      }
    }
  }

  private getTargetBaseUrl(path: string): string | null {
    const userUrl = this.config.get<string>('USER_SERVICE_URL');
    const workspaceUrl = this.config.get<string>('WORKSPACE_SERVICE_URL');
    const projectTaskUrl = this.config.get<string>('PROJECT_TASK_SERVICE_URL');

    if (path.startsWith('/auth') || path.startsWith('/users')) {
      return userUrl ?? null;
    }

    if (path.startsWith('/workspaces')) {
      if (path.match(/\/workspaces\/[^/]+\/projects/)) {
        return projectTaskUrl ?? null;
      }
      return workspaceUrl ?? null;
    }

    return null;
  }
}
