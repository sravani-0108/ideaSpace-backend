import { Router, Request, Response } from 'express';
import { CommentController } from '../controllers/comment.controller';
import { validateRequest } from '../middlewares/validation.middleware';
import { CreateCommentDto } from '../dto/comment.dto';
import { AuthRequest } from '../middlewares/auth.middleware';

const router = Router({ mergeParams: true });
const commentController = new CommentController();

// Note: authMiddleware is already applied in parent route (idea.routes.ts)

router.post('/', validateRequest(CreateCommentDto), (req: Request, res: Response) => {
  commentController.createComment(req as AuthRequest, res);
});

export default router;

