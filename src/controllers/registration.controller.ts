import { Response } from 'express';
import { RegistrationService } from '../services/registration.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ApiResponse } from '../dto/common.dto';

const registrationService = new RegistrationService();

export class RegistrationController {
  async register(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { hackathonId } = req.params;
      const registration = await registrationService.registerForHackathon(hackathonId, req.userId!);

      const response: ApiResponse<any> = {
        success: true,
        message: 'Successfully registered for hackathon',
        data: registration,
      };

      res.status(201).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to register for hackathon',
      };
      res.status(400).json(response);
    }
  }

  async unregister(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { hackathonId } = req.params;
      await registrationService.unregisterFromHackathon(hackathonId, req.userId!);

      const response: ApiResponse<null> = {
        success: true,
        message: 'Successfully unregistered from hackathon',
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to unregister from hackathon',
      };
      res.status(400).json(response);
    }
  }

  async getHackathonRegistrations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { hackathonId } = req.params;
      const registrations = await registrationService.getRegistrationsByHackathon(hackathonId);

      const response: ApiResponse<any> = {
        success: true,
        data: registrations,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to fetch registrations',
      };
      res.status(400).json(response);
    }
  }

  async getUserRegistrations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const registrations = await registrationService.getUserRegistrations(req.userId!);

      const response: ApiResponse<any> = {
        success: true,
        data: registrations,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to fetch user registrations',
      };
      res.status(400).json(response);
    }
  }

  async checkRegistrationStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { hackathonId } = req.params;
      const isRegistered = await registrationService.isUserRegistered(hackathonId, req.userId!);

      const response: ApiResponse<any> = {
        success: true,
        data: { isRegistered },
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to check registration status',
      };
      res.status(400).json(response);
    }
  }
}

