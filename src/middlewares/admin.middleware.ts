import { Response, NextFunction } from 'express';
import { UserRole } from '../enums/UserRole';
import { AuthRequest } from './auth.middleware';
import { ApiResponse } from '../dto/common.dto';

export const adminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    const response: ApiResponse<null> = {
      success: false,
      message: 'Authentication required',
    };
    res.status(401).json(response);
    return;
  }

  if (req.user.role !== UserRole.ADMIN) {
    const response: ApiResponse<null> = {
      success: false,
      message: 'Admin access required',
    };
    res.status(403).json(response);
    return;
  }

  next();
};

