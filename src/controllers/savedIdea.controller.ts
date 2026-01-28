import { Response } from 'express';
import { SavedIdeaService } from '../services/savedIdea.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ApiResponse } from '../dto/common.dto';

const savedIdeaService = new SavedIdeaService();

export class SavedIdeaController {
  async saveIdea(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ideaId } = req.params;
      const savedIdea = await savedIdeaService.saveIdea(ideaId, req.userId!);

      const response: ApiResponse<any> = {
        success: true,
        message: 'Idea saved successfully',
        data: savedIdea,
      };

      res.status(201).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to save idea',
      };
      res.status(400).json(response);
    }
  }

  async unsaveIdea(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ideaId } = req.params;
      await savedIdeaService.unsaveIdea(ideaId, req.userId!);

      const response: ApiResponse<null> = {
        success: true,
        message: 'Idea unsaved successfully',
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to unsave idea',
      };
      res.status(400).json(response);
    }
  }

  async getSavedIdeas(req: AuthRequest, res: Response): Promise<void> {
    try {
      const ideas = await savedIdeaService.getSavedIdeas(req.userId!);

      const response: ApiResponse<any> = {
        success: true,
        data: ideas,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to fetch saved ideas',
      };
      res.status(400).json(response);
    }
  }

  async checkSavedStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ideaId } = req.params;
      const isSaved = await savedIdeaService.isIdeaSaved(ideaId, req.userId!);

      const response: ApiResponse<any> = {
        success: true,
        data: { isSaved },
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to check saved status',
      };
      res.status(400).json(response);
    }
  }
}

