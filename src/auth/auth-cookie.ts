import { Request } from 'express';

export function readAuthCookie(
  request: Request,
  name: 'artwork_access' | 'artwork_refresh',
): string | null {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    return null;
  }
  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return cookie?.slice(name.length + 1) || null;
}
