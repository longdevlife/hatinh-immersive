export const ACCESS_COOKIE_NAME = 'hatinh_access';
export const REFRESH_COOKIE_NAME = 'hatinh_refresh';

export function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header) return {};

  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .map((part) => {
        const separator = part.indexOf('=');
        if (separator < 0) return [part, ''];
        return [part.slice(0, separator), part.slice(separator + 1)];
      }),
  );
}

export function serializeSessionCookie(
  name: string,
  value: string,
  maxAgeSeconds: number,
  secure: boolean,
): string {
  return [
    `${name}=${value}`,
    `Max-Age=${maxAgeSeconds}`,
    'Path=/api/v1/admin',
    'HttpOnly',
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}
