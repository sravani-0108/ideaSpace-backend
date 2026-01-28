import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt.util';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { ApiResponse } from '../dto/common.dto';

export interface AuthRequest extends Request {
  user?: User;
  userId?: string;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Authorization token required',
      };
      res.status(401).json(response);
      return;
    }

    const token = authHeader.substring(7);
    const payload: JWTPayload = verifyToken(token);

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: payload.userId },
    });

    if (!user) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'User not found',
      };
      res.status(401).json(response);
      return;
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      message: 'Invalid or expired token',
    };
    res.status(401).json(response);
  }
};

