import { Router, Request, Response } from 'express';
import { UserController } from '../controllers/user.controller';
import { CommentController } from '../controllers/comment.controller';
import { validateRequest } from '../middlewares/validation.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { uploadProfilePicture } from '../middlewares/upload.middleware';
import { UpdateProfileDto } from '../dto/user.dto';

const router = Router();
const userController = new UserController();
const commentController = new CommentController();

// Get current user profile
router.get('/profile', authMiddleware, (req: Request, res: Response) => {
  userController.getProfile(req as any, res);
});

// Update current user profile (with optional file upload)
router.put('/profile', authMiddleware, uploadProfilePicture.single('profilePicture'), (req: Request, res: Response) => {
  userController.updateProfile(req as any, res);
});

// Upload profile picture only
router.post('/profile/picture', authMiddleware, uploadProfilePicture.single('profilePicture'), (req: Request, res: Response) => {
  userController.uploadProfilePicture(req as any, res);
});

// Get comments by user ID (public profile)
router.get('/:userId/comments', (req: Request, res: Response) => {
  commentController.getCommentsByUserId(req as any, res);
});

// Get all users (admin only) - for assigning as judges
router.get('/all', authMiddleware, (req: Request, res: Response) => {
  userController.getAllUsers(req as any, res);
});

// Get all judges (admin only) - backward compatibility, returns all users
router.get('/judges/all', authMiddleware, (req: Request, res: Response) => {
  userController.getAllJudges(req as any, res);
});

// Get user by ID (public profile) - must be last to avoid conflicts
router.get('/:userId', (req: Request, res: Response) => {
  userController.getUserById(req as any, res);
});

export default router;

