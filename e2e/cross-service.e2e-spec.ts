import * as dotenv from 'dotenv';
import * as path from 'path';
import axios, { AxiosInstance } from 'axios';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

const BASE_URL = process.env.TEST_API_GATEWAY_URL || 'http://localhost:3000';

async function waitForGateway(maxAttempts = 60): Promise<void> {
  await new Promise((r) => setTimeout(r, 5000));
  let lastError: string = '';
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await axios.get(`${BASE_URL}/auth/login`, {
        validateStatus: () => true,
        timeout: 5000,
      });
      return;
    } catch (err) {
      lastError =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: string }).code)
          : String(err);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(
    `Gateway at ${BASE_URL} not ready after ${maxAttempts} attempts. Last error: ${lastError}`,
  );
}

function createClient(token?: string): AxiosInstance {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return axios.create({
    baseURL: BASE_URL,
    headers,
    validateStatus: () => true,
    timeout: 15000,
  });
}

describe('Cross-Service E2E', () => {
  const client = createClient();
  let token: string;
  beforeAll(async () => {
    await waitForGateway();
  });
  let userId: string;
  let userId2: string;
  let workspaceId: string;
  let projectId: string;
  let taskId: string;

  const timestamp = Date.now();
  const user1 = {
    username: `e2e_user_${timestamp}`,
    email: `e2e_${timestamp}@test.local`,
    fullname: 'E2E Test User',
    password: 'testpass123',
  };
  const user2 = {
    username: `e2e_user2_${timestamp}`,
    email: `e2e2_${timestamp}@test.local`,
    fullname: 'E2E Test User 2',
    password: 'testpass456',
  };

  it('1. POST /auth/register - obtain token', async () => {
    const res = await client.post('/auth/register', user1);
    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty('access_token');
    expect(typeof res.data.access_token).toBe('string');
    token = res.data.access_token;

    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString(),
    );
    expect(payload).toHaveProperty('sub');
    userId = payload.sub;
  });

  it('2. POST /workspaces (with token) - create workspace', async () => {
    const authClient = createClient(token);
    const res = await authClient.post('/workspaces', {
      name: `E2E Workspace ${timestamp}`,
      description: 'Created by E2E test',
    });
    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty('id');
    expect(res.data).toHaveProperty('name');
    workspaceId = res.data.id;
  });

  it('3. POST /workspaces/:id/participants - add participant (User Service validation)', async () => {
    const authClient = createClient(token);
    const registerRes = await client.post('/auth/register', user2);
    expect(registerRes.status).toBe(201);
    const payload = JSON.parse(
      Buffer.from(
        registerRes.data.access_token.split('.')[1],
        'base64',
      ).toString(),
    );
    userId2 = payload.sub;

    const res = await authClient.post(
      `/workspaces/${workspaceId}/participants`,
      { userId: userId2, role: 'Member' },
    );
    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty('id');
    expect(res.data.userId).toBe(userId2);
    expect(res.data.role).toBe('Member');
    expect(res.data.user).toBeDefined();
    expect(res.data.user).toMatchObject({ id: userId2, email: user2.email, fullname: user2.fullname });
  });

  it('4. POST /workspaces/:id/projects - create project', async () => {
    const authClient = createClient(token);
    const res = await authClient.post(`/workspaces/${workspaceId}/projects`, {
      name: `E2E Project ${timestamp}`,
      description: 'E2E project desc',
    });
    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty('id');
    expect(res.data).toHaveProperty('name');
    projectId = res.data.id;
  });

  it('5. POST /projects/:id/tasks with assignees and tags - create task (User + Workspace)', async () => {
    const authClient = createClient(token);
    const res = await authClient.post(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      {
        title: `E2E Task ${timestamp}`,
        description: 'Task with assignees and tags',
        assignees: [userId, userId2],
        tags: ['urgent', 'e2e'],
        priority: 'HIGH',
      },
    );
    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty('id');
    expect(res.data).toHaveProperty('title');
    expect(res.data).toHaveProperty('assigneeIds');
    expect(Array.isArray(res.data.assigneeIds)).toBe(true);
    expect(res.data.assigneeIds).toContain(userId);
    expect(res.data.assigneeIds).toContain(userId2);
    expect(res.data).toHaveProperty('tagIds');
    expect(Array.isArray(res.data.tagIds)).toBe(true);
    expect(res.data.tagIds.length).toBeGreaterThan(0);
    taskId = res.data.id;
  });

  it('6. GET /tasks/:id - verify task created', async () => {
    const authClient = createClient(token);
    const res = await authClient.get(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
    );
    expect(res.status).toBe(200);
    expect(res.data.id).toBe(taskId);
    expect(res.data.title).toContain('E2E Task');
  });

  describe('Negative scenarios', () => {
    it('should return 401 with invalid token', async () => {
      const invalidClient = createClient('invalid-jwt-token');
      const res = await invalidClient.get('/auth');
      expect(res.status).toBe(401);
    });

    it('should return 401 with malformed Authorization header', async () => {
      const res = await axios.get(`${BASE_URL}/auth`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'InvalidFormat token',
        },
        validateStatus: () => true,
        timeout: 5000,
      });
      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent workspace', async () => {
      const authClient = createClient(token);
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await authClient.get(`/workspaces/${fakeId}`);
      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent project', async () => {
      const authClient = createClient(token);
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await authClient.get(
        `/workspaces/${workspaceId}/projects/${fakeId}`,
      );
      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent task', async () => {
      const authClient = createClient(token);
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await authClient.get(
        `/workspaces/${workspaceId}/projects/${projectId}/tasks/${fakeId}`,
      );
      expect(res.status).toBe(404);
    });

    it('should return 400 on invalid register payload', async () => {
      const res = await client.post('/auth/register', {
        username: '',
        email: 'invalid-email',
        fullname: '',
        password: 'short',
      });
      expect(res.status).toBe(400);
    });

    it('should return 400 on invalid login payload', async () => {
      const res = await client.post('/auth/login', {
        email: 'not-email',
        password: 'x',
      });
      expect(res.status).toBe(400);
    });

    it('should return 400 on invalid workspace create payload', async () => {
      const authClient = createClient(token);
      const res = await authClient.post('/workspaces', { name: '' });
      expect(res.status).toBe(400);
    });

    it('should return 400 on invalid task create payload', async () => {
      const authClient = createClient(token);
      const res = await authClient.post(
        `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
        { title: 'ab' },
      );
      expect(res.status).toBe(400);
    });
  });

  describe('Edge cases', () => {
    it('should return 409 when registering with duplicate username', async () => {
      const res = await client.post('/auth/register', {
        username: user1.username,
        email: `duplicate_username_${timestamp}@test.local`,
        fullname: 'Duplicate',
        password: 'testpass123',
      });
      expect(res.status).toBe(409);
      expect(res.data?.message || res.data?.error).toMatch(/username|exists/i);
    });

    it('should return 409 when registering with duplicate email', async () => {
      const res = await client.post('/auth/register', {
        username: `duplicate_email_${timestamp}`,
        email: user1.email,
        fullname: 'Duplicate',
        password: 'testpass123',
      });
      expect(res.status).toBe(409);
      expect(res.data?.message || res.data?.error).toMatch(/email|exists/i);
    });

    it('should return 409 when adding participant already in workspace', async () => {
      const authClient = createClient(token);
      const res = await authClient.post(
        `/workspaces/${workspaceId}/participants`,
        { userId: userId2, role: 'Member' },
      );
      expect(res.status).toBe(409);
      expect(res.data?.message || res.data?.error).toMatch(
        /already|participant/i,
      );
    });
  });
});
