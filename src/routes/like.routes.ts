import { Router, Request, Response } from 'express';
import { LikeController } from '../controllers/like.controller';
import { AuthRequest } from '../middlewares/auth.middleware';

const router = Router({ mergeParams: true });
const likeController = new LikeController();

// Note: authMiddleware is already applied in parent route (idea.routes.ts)

router.post('/', (req: Request, res: Response) => {
  likeController.likeIdea(req as AuthRequest, res);
});

router.delete('/', (req: Request, res: Response) => {
  likeController.unlikeIdea(req as AuthRequest, res);
});

export default router;

