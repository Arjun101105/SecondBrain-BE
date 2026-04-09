import { Response, NextFunction } from 'express';
import * as jose from 'jose';
import { AuthRequest, JwtPayload } from '../types/index';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars-here-12345');

export async function verifyJWT(token: string): Promise<JwtPayload> {
  try {
    const verified = await jose.jwtVerify(token, JWT_SECRET);
    return {
      userId: verified.payload.userId as string,
      username: verified.payload.username as string,
      iat: verified.payload.iat,
      exp: verified.payload.exp,
    };
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export function getTokenFromRequest(req: AuthRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
}

export async function getCurrentUser(req: AuthRequest): Promise<JwtPayload | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  try {
    return await verifyJWT(token);
  } catch (error) {
    return null;
  }
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No token provided',
        statusCode: 401,
      });
    }

    const user = await verifyJWT(token);
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized - Invalid token',
      statusCode: 401,
    });
  }
}

export async function createToken(payload: JwtPayload): Promise<string> {
  const expiresIn = process.env.JWT_EXPIRATION || '7d';
  return await new jose.SignJWT({ ...payload } as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
}
