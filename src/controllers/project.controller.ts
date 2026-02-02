import { Response } from 'express';
import { ProjectService } from '../services/project.service';
import { SubmitProjectDto, ReviewProjectDto } from '../dto/project.dto';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ApiResponse } from '../dto/common.dto';

const projectService = new ProjectService();

export class ProjectController {
  async submitProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ideaId } = req.params;
      const submitDto: SubmitProjectDto = req.body;
      const project = await projectService.submitProject(ideaId, req.userId!, submitDto);

      const response: ApiResponse<any> = {
        success: true,
        data: project,
        message: 'Project submitted successfully',
      };

      res.status(201).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to submit project',
      };
      res.status(400).json(response);
    }
  }

  async reviewProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const reviewDto: ReviewProjectDto = req.body;
      const project = await projectService.reviewProject(projectId, req.userId!, reviewDto);

      const response: ApiResponse<any> = {
        success: true,
        data: project,
        message: 'Project reviewed successfully',
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to review project',
      };
      res.status(400).json(response);
    }
  }

  async getProjectByIdea(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ideaId } = req.params;
      const project = await projectService.getProjectByIdeaId(ideaId, req.userId!);

      const response: ApiResponse<any> = {
        success: true,
        data: project,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to fetch project',
      };
      res.status(404).json(response);
    }
  }

  async getProjectsByHackathon(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { hackathonId } = req.params;
      const projects = await projectService.getProjectsByHackathon(hackathonId);

      const response: ApiResponse<any> = {
        success: true,
        data: projects,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to fetch projects',
      };
      res.status(400).json(response);
    }
  }

  async getAllProjects(req: AuthRequest, res: Response): Promise<void> {
    try {
      const projects = await projectService.getAllProjects();

      const response: ApiResponse<any> = {
        success: true,
        data: projects,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to fetch projects',
      };
      res.status(400).json(response);
    }
  }

  async getProjectById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const project = await projectService.getProjectById(projectId);

      if (!project) {
        const response: ApiResponse<null> = {
          success: false,
          message: 'Project not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<any> = {
        success: true,
        data: project,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to fetch project',
      };
      res.status(400).json(response);
    }
  }

  async getProjectsNeedingReview(req: AuthRequest, res: Response): Promise<void> {
    try {
      const projects = await projectService.getProjectsNeedingReview();

      const response: ApiResponse<any> = {
        success: true,
        data: projects,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to fetch projects',
      };
      res.status(400).json(response);
    }
  }
}

