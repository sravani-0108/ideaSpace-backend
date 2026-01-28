import { Router, Request, Response } from 'express';
import { SavedIdeaController } from '../controllers/savedIdea.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { AuthRequest } from '../middlewares/auth.middleware';

const router = Router();
const savedIdeaController = new SavedIdeaController();

// All saved idea routes require authentication
router.use(authMiddleware);

router.post('/ideas/:ideaId/save', (req: Request, res: Response) => {
  savedIdeaController.saveIdea(req as AuthRequest, res);
});

router.delete('/ideas/:ideaId/save', (req: Request, res: Response) => {
  savedIdeaController.unsaveIdea(req as AuthRequest, res);
});

router.get('/saved', (req: Request, res: Response) => {
  savedIdeaController.getSavedIdeas(req as AuthRequest, res);
});

router.get('/ideas/:ideaId/saved-status', (req: Request, res: Response) => {
  savedIdeaController.checkSavedStatus(req as AuthRequest, res);
});

export default router;

