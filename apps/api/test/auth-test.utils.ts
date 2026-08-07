import type { NestFastifyApplication } from '@nestjs/platform-fastify';

const testEmail = 'integration-admin@hatinh.example';
const testPassword = 'integration password secure';

export function configureTestBootstrap(): void {
  process.env.AUTH_BOOTSTRAP_EMAIL = testEmail;
  process.env.AUTH_BOOTSTRAP_PASSWORD = testPassword;
  process.env.AUTH_BOOTSTRAP_ROLE = 'ADMIN';
}

export async function loginAsAdmin(app: NestFastifyApplication): Promise<string> {
  const response = await app
    .getHttpAdapter()
    .getInstance()
    .inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      payload: { email: testEmail, password: testPassword },
    });
  if (response.statusCode !== 200) {
    throw new Error(`TEST_ADMIN_LOGIN_FAILED_${response.statusCode}`);
  }

  const cookies = response.headers['set-cookie'];
  return (Array.isArray(cookies) ? cookies : [cookies])
    .filter((cookie): cookie is string => typeof cookie === 'string')
    .map((cookie) => cookie.split(';', 1)[0])
    .join('; ');
}

export async function adminInject(
  app: NestFastifyApplication,
  cookie: string,
  options: {
    method: 'DELETE' | 'PATCH' | 'POST';
    url: string;
    payload?: object | string | Buffer | NodeJS.ReadableStream;
    headers?: Record<string, string>;
  },
): Promise<TestInjectResponse> {
  return app
    .getHttpAdapter()
    .getInstance()
    .inject({
      ...options,
      headers: { ...options.headers, cookie },
    }) as unknown as Promise<TestInjectResponse>;
}

export interface TestInjectResponse {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  json<T = any>(): T;
}
