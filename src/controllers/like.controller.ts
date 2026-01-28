import { Response } from 'express';
import { LikeService } from '../services/like.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ApiResponse } from '../dto/common.dto';

const likeService = new LikeService();

export class LikeController {
  async likeIdea(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ideaId } = req.params;
      const like = await likeService.likeIdea(ideaId, req.userId!);

      const response: ApiResponse<any> = {
        success: true,
        message: 'Idea liked successfully',
        data: like,
      };

      res.status(201).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to like idea',
      };
      res.status(400).json(response);
    }
  }

  async unlikeIdea(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ideaId } = req.params;
      await likeService.unlikeIdea(ideaId, req.userId!);

      const response: ApiResponse<null> = {
        success: true,
        message: 'Idea unliked successfully',
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to unlike idea',
      };
      res.status(400).json(response);
    }
  }
}

