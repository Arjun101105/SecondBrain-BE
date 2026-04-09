import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  username: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
  clientIp?: string;
  file?: Express.Multer.File;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  statusCode: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  skip?: number;
}
