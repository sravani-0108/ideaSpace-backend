import { Response } from 'express';
import { IdeaService } from '../services/idea.service';
import { CreateIdeaDto, UpdateProjectDetailsDto } from '../dto/idea.dto';
import { PaginationDto } from '../dto/common.dto';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ApiResponse } from '../dto/common.dto';
import { UserRole } from '../enums/UserRole';
import { uploadIdeaFiles } from '../middlewares/upload-idea-files.middleware';

const ideaService = new IdeaService();

export class IdeaController {
  async createIdea(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Check if files are present (from multer middleware)
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      
      const createIdeaDto: CreateIdeaDto = {
        title: req.body.title,
        description: req.body.description,
        hackathonId: req.body.hackathonId,
        gitRepositoryUrl: req.body.gitRepositoryUrl,
        documentationUrl: files?.documentation?.[0] 
          ? `/api/uploads/idea-files/${files.documentation[0].filename}` 
          : req.body.documentationUrl,
        videoUrl: files?.video?.[0] 
          ? `/api/uploads/idea-files/${files.video[0].filename}` 
          : req.body.videoUrl,
        zipFilePath: files?.zipFile?.[0] 
          ? `/api/uploads/idea-files/${files.zipFile[0].filename}` 
          : req.body.zipFilePath,
      };

      // Basic validation
      if (!createIdeaDto.title || !createIdeaDto.description) {
        const response: ApiResponse<null> = {
          success: false,
          message: 'Title and description are required',
        };
        res.status(400).json(response);
        return;
      }

      // Get user role from the authenticated user object
      const userRole = req.user?.role as UserRole;
      const idea = await ideaService.createIdea(req.userId!, createIdeaDto, userRole);

      const response: ApiResponse<any> = {
        success: true,
        data: idea,
        message: userRole === UserRole.ADMIN || userRole === UserRole.JUDGE 
          ? 'Idea created and automatically published.' 
          : 'Idea submitted successfully. Waiting for admin approval.',
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
      const userRole = req.user?.role as UserRole;
      // Pass userId and userRole so users can see their own ideas and admins can see all ideas
      const idea = await ideaService.getIdeaById(id, req.userId, userRole);

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

  async getIdeasByUserId(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const pagination: PaginationDto = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };

      const result = await ideaService.getIdeasByUserId(userId, pagination);

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
        message: error.message || 'Failed to fetch user ideas',
      };
      res.status(400).json(response);
    }
  }

  async getHandsOnHackathonIdeas(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { hackathonId } = req.params;
      const pagination: PaginationDto = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      const userRole = req.user?.role as UserRole;

      const result = await ideaService.getHandsOnHackathonIdeas(
        hackathonId,
        req.userId,
        userRole,
        pagination
      );

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
        message: error.message || 'Failed to fetch hackathon ideas',
      };
      res.status(400).json(response);
    }
  }

  async updateProjectDetails(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ideaId } = req.params;
      const updateDto: UpdateProjectDetailsDto = {
        githubUrl: req.body.githubUrl,
        demoVideoUrl: req.body.demoVideoUrl,
        documentationUrl: req.body.documentationUrl,
        zipFilePath: req.body.zipFilePath,
        projectDescription: req.body.projectDescription,
        implementationDetails: req.body.implementationDetails,
        pitchVideoUrl: req.body.pitchVideoUrl,
        presentationUrl: req.body.presentationUrl,
      };

      const idea = await ideaService.updateProjectDetails(ideaId, req.userId!, updateDto);

      const response: ApiResponse<any> = {
        success: true,
        data: idea,
        message: 'Project details updated successfully',
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to update project details',
      };
      res.status(400).json(response);
    }
  }
}

