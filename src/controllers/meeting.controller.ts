import { Response } from 'express';
import { MeetingService } from '../services/meeting.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ApiResponse } from '../dto/common.dto';

const meetingService = new MeetingService();

export class MeetingController {
  async createMeeting(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { hackathonId } = req.params;
      const { title, description, scheduledDate, meetingLink, teamId } = req.body;

      if (!title || !scheduledDate) {
        throw new Error('Title and scheduled date are required');
      }

      const meeting = await meetingService.createMeeting(
        hackathonId,
        req.userId!,
        title,
        description,
        new Date(scheduledDate),
        meetingLink,
        teamId
      );

      const response: ApiResponse<any> = {
        success: true,
        message: 'Meeting created successfully',
        data: meeting,
      };

      res.status(201).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to create meeting',
      };
      res.status(400).json(response);
    }
  }

  async getHackathonMeetings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { hackathonId } = req.params;
      const meetings = await meetingService.getMeetingsByHackathon(hackathonId);

      const response: ApiResponse<any> = {
        success: true,
        data: meetings,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to fetch meetings',
      };
      res.status(400).json(response);
    }
  }

  async getTeamMeetings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;
      const meetings = await meetingService.getMeetingsByTeam(teamId);

      const response: ApiResponse<any> = {
        success: true,
        data: meetings,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to fetch team meetings',
      };
      res.status(400).json(response);
    }
  }

  async getUserMeetings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const meetings = await meetingService.getUserMeetings(req.userId!);

      const response: ApiResponse<any> = {
        success: true,
        data: meetings,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to fetch user meetings',
      };
      res.status(400).json(response);
    }
  }

  async updateMeeting(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, description, scheduledDate, meetingLink } = req.body;
      const meeting = await meetingService.updateMeeting(
        id,
        req.userId!,
        title,
        description,
        scheduledDate ? new Date(scheduledDate) : undefined,
        meetingLink
      );

      const response: ApiResponse<any> = {
        success: true,
        message: 'Meeting updated successfully',
        data: meeting,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to update meeting',
      };
      res.status(400).json(response);
    }
  }

  async deleteMeeting(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await meetingService.deleteMeeting(id, req.userId!);

      const response: ApiResponse<null> = {
        success: true,
        message: 'Meeting deleted successfully',
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to delete meeting',
      };
      res.status(400).json(response);
    }
  }
}

