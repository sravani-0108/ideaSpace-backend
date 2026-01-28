import { Router, Request, Response } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { AuthRequest } from '../middlewares/auth.middleware';

const router = Router();
const adminController = new AdminController();

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/ideas/review', (req: Request, res: Response) => {
  adminController.getIdeasForReview(req as AuthRequest, res);
});

router.patch('/ideas/:id/approve', (req: Request, res: Response) => {
  adminController.approveIdea(req as AuthRequest, res);
});

router.patch('/ideas/:id/reject', (req: Request, res: Response) => {
  adminController.rejectIdea(req as AuthRequest, res);
});

router.patch('/ideas/:id/publish', (req: Request, res: Response) => {
  adminController.publishIdea(req as AuthRequest, res);
});

export default router;

