import { Response } from 'express';
import { HackathonService } from '../services/hackathon.service';
import { CreateHackathonDto, UpdateHackathonDto } from '../dto/hackathon.dto';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ApiResponse } from '../dto/common.dto';
import { HackathonStatus } from '../enums/HackathonStatus';

const hackathonService = new HackathonService();

export class HackathonController {
  async createHackathon(req: AuthRequest, res: Response): Promise<void> {
    try {
      const createHackathonDto: CreateHackathonDto = req.body;
      const hackathon = await hackathonService.createHackathon(req.userId!, createHackathonDto);

      const response: ApiResponse<any> = {
        success: true,
        message: 'Hackathon created successfully',
        data: hackathon,
      };

      res.status(201).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to create hackathon',
      };
      res.status(400).json(response);
    }
  }

  async getAllHackathons(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hackathons = await hackathonService.getAllHackathons();

      const response: ApiResponse<any> = {
        success: true,
        data: hackathons,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to fetch hackathons',
      };
      res.status(400).json(response);
    }
  }

  async getHackathonById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const hackathon = await hackathonService.getHackathonById(id);

      const response: ApiResponse<any> = {
        success: true,
        data: hackathon,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to fetch hackathon',
      };
      res.status(404).json(response);
    }
  }

  async updateHackathon(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateHackathonDto: UpdateHackathonDto = req.body;
      const hackathon = await hackathonService.updateHackathon(id, req.userId!, updateHackathonDto);

      const response: ApiResponse<any> = {
        success: true,
        message: 'Hackathon updated successfully',
        data: hackathon,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to update hackathon',
      };
      res.status(400).json(response);
    }
  }

  async updateStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!Object.values(HackathonStatus).includes(status)) {
        throw new Error('Invalid status');
      }

      const hackathon = await hackathonService.updateHackathonStatus(id, status);

      const response: ApiResponse<any> = {
        success: true,
        message: 'Hackathon status updated successfully',
        data: hackathon,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to update hackathon status',
      };
      res.status(400).json(response);
    }
  }

  async deleteHackathon(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await hackathonService.deleteHackathon(id, req.userId!);

      const response: ApiResponse<null> = {
        success: true,
        message: 'Hackathon deleted successfully',
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to delete hackathon',
      };
      res.status(400).json(response);
    }
  }

  async getNextHackathon(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hackathon = await hackathonService.getNextHackathon();

      const response: ApiResponse<any> = {
        success: true,
        data: hackathon,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to fetch next hackathon',
      };
      res.status(400).json(response);
    }
  }

  async sendReminders(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await hackathonService.sendRemindersToRegisteredUsers(id);

      let message = '';
      if (result.sent > 0 && result.skipped > 0) {
        message = `Reminders sent to ${result.sent} users. ${result.skipped} users already have unread reminders.`;
      } else if (result.sent > 0) {
        message = `Reminders sent to ${result.sent} users.`;
      } else if (result.skipped > 0) {
        message = `All ${result.skipped} registered users already have unread reminders. No new reminders sent.`;
      } else {
        message = 'No registered users found.';
      }
      
      if (result.failed > 0) {
        message += ` ${result.failed} failed.`;
      }

      const response: ApiResponse<any> = {
        success: true,
        data: result,
        message,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to send reminders',
      };
      res.status(400).json(response);
    }
  }
}

