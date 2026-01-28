import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../dto/common.dto';

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  const response: ApiResponse<null> = {
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  };

  res.status(500).json(response);
};

