import { Router, Request, Response } from 'express';
import { IdeaController } from '../controllers/idea.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import { CreateIdeaDto } from '../dto/idea.dto';
import { AuthRequest } from '../middlewares/auth.middleware';
import commentRoutes from './comment.routes';
import likeRoutes from './like.routes';

const router = Router();
const ideaController = new IdeaController();

// All idea routes require authentication
router.use(authMiddleware);

router.post('/', validateRequest(CreateIdeaDto), (req: Request, res: Response) => {
  ideaController.createIdea(req as AuthRequest, res);
});

// Feed endpoint - returns published ideas (public, but auth recommended for personalization)
router.get('/feed', (req: Request, res: Response) => {
  ideaController.getFeed(req as AuthRequest, res);
});

// Legacy endpoint - kept for backward compatibility
router.get('/', (req: Request, res: Response) => {
  ideaController.getApprovedIdeas(req as AuthRequest, res);
});

router.get('/my-ideas', (req: Request, res: Response) => {
  ideaController.getMyIdeas(req as AuthRequest, res);
});

// Get ideas by user ID (public profile)
router.get('/user/:userId', (req: Request, res: Response) => {
  ideaController.getIdeasByUserId(req as AuthRequest, res);
});

router.get('/:id', (req: Request, res: Response) => {
  ideaController.getIdeaById(req as AuthRequest, res);
});

// Nested routes for comments and likes
router.use('/:ideaId/comments', commentRoutes);
router.use('/:ideaId/like', likeRoutes);

export default router;

