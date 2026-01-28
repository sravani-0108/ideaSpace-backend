import { Response } from 'express';
import { IdeaService } from '../services/idea.service';
import { CreateIdeaDto } from '../dto/idea.dto';
import { PaginationDto } from '../dto/common.dto';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ApiResponse } from '../dto/common.dto';
import { UserRole } from '../enums/UserRole';

const ideaService = new IdeaService();

export class IdeaController {
  async createIdea(req: AuthRequest, res: Response): Promise<void> {
    try {
      const createIdeaDto: CreateIdeaDto = req.body;
      // Get user role from the authenticated user object
      const userRole = req.user?.role as UserRole;
      const idea = await ideaService.createIdea(req.userId!, createIdeaDto, userRole);

      const response: ApiResponse<any> = {
        success: true,
        data: idea,
        message: userRole === UserRole.ADMIN 
          ? 'Idea created and automatically published.' 
          : 'Idea created successfully. Waiting for admin approval.',
      };

      res.status(201).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to create idea',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get published ideas feed (public endpoint)
   * Returns only PUBLISHED ideas with aggregated counts
   */
  async getFeed(req: AuthRequest, res: Response): Promise<void> {
    try {
      const pagination: PaginationDto = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };

      const result = await ideaService.getFeed(pagination);

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
        message: error.message || 'Failed to fetch feed',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Legacy endpoint - kept for backward compatibility
   */
  async getApprovedIdeas(req: AuthRequest, res: Response): Promise<void> {
    try {
      const pagination: PaginationDto = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };

      const result = await ideaService.getApprovedIdeas(pagination);

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
        message: error.message || 'Failed to fetch ideas',
      };
      res.status(400).json(response);
    }
  }

  async getIdeaById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      // Pass userId so users can see their own REVIEW ideas
      const idea = await ideaService.getIdeaById(id, req.userId);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          ...idea,
          likesCount: idea.likes?.length || 0,
          commentsCount: idea.comments?.length || 0,
        },
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to fetch idea',
      };
      res.status(404).json(response);
    }
  }

  async getMyIdeas(req: AuthRequest, res: Response): Promise<void> {
    try {
      const pagination: PaginationDto = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };

      const result = await ideaService.getMyIdeas(req.userId!, pagination);

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
        message: error.message || 'Failed to fetch your ideas',
      };
      res.status(400).json(response);
    }
  }
}

