import { Response } from 'express';
import { IdeaService } from '../services/idea.service';
import { PaginationDto } from '../dto/common.dto';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ApiResponse } from '../dto/common.dto';
import { ApproveIdeaDto } from '../dto/idea.dto';

const ideaService = new IdeaService();

export class AdminController {
  async getIdeasForReview(req: AuthRequest, res: Response): Promise<void> {
    try {
      const pagination: PaginationDto = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };

      const result = await ideaService.getIdeasForReview(pagination);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          ideas: result.ideas,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages,
          },
        },
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to fetch ideas for review',
      };
      res.status(400).json(response);
    }
  }

  async approveIdea(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.userId!; // Admin's user ID from auth middleware
      const approveDto: ApproveIdeaDto = req.body; // May contain projectDeadline
      const idea = await ideaService.approveIdea(id, adminId, approveDto);

      const response: ApiResponse<any> = {
        success: true,
        message: 'Idea approved successfully. Ready to publish.',
        data: {
          id: idea.id,
          status: idea.status,
          approvedBy: idea.approvedBy,
          projectDeadline: idea.projectDeadline,
        },
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to approve idea',
      };
      res.status(400).json(response);
    }
  }

  async publishIdea(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const idea = await ideaService.publishIdea(id);

      const response: ApiResponse<any> = {
        success: true,
        message: 'Idea published successfully. Now visible in feed.',
        data: {
          id: idea.id,
          status: idea.status,
        },
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to publish idea',
      };
      res.status(400).json(response);
    }
  }

  async rejectIdea(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const rejectDto: ApproveIdeaDto = req.body; // May contain rejectionReason
      const idea = await ideaService.rejectIdea(id, rejectDto);

      const response: ApiResponse<any> = {
        success: true,
        message: 'Idea rejected successfully',
        data: {
          id: idea.id,
          status: idea.status,
        },
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to reject idea',
      };
      res.status(400).json(response);
    }
  }
}

