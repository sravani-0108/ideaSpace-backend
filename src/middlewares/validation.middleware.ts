import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ApiResponse } from '../dto/common.dto';

export const validateRequest = (dtoClass: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const dto = plainToInstance(dtoClass, req.body);
    const errors: ValidationError[] = await validate(dto);

    if (errors.length > 0) {
      const formattedErrors = errors.map((error) => ({
        field: error.property,
        message: Object.values(error.constraints || {})[0] || 'Validation failed',
      }));

      const response: ApiResponse<null> = {
        success: false,
        message: 'Validation failed',
        errors: formattedErrors,
      };

      return res.status(400).json(response);
    }

    req.body = dto;
    next();
  };
};

