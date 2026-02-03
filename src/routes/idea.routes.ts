import { Router, Request, Response } from 'express';
import { IdeaController } from '../controllers/idea.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import { CreateIdeaDto } from '../dto/idea.dto';
import { AuthRequest } from '../middlewares/auth.middleware';
import { uploadIdeaFiles } from '../middlewares/upload-idea-files.middleware';
import commentRoutes from './comment.routes';
import likeRoutes from './like.routes';

const router = Router();
const ideaController = new IdeaController();

// All idea routes require authentication
router.use(authMiddleware);

// Create idea route - handle both JSON and multipart/form-data (for file uploads)
const uploadMiddleware = uploadIdeaFiles.fields([
  { name: 'documentation', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'zipFile', maxCount: 1 },
]);

router.post('/', (req: Request, res: Response, next: any) => {
  // Check content-type to determine if files are being uploaded
  const contentType = req.headers['content-type'] || '';
  
  if (contentType.includes('multipart/form-data')) {
    // Handle file uploads with multer middleware
    uploadMiddleware(req, res, (err: any) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload failed',
        });
      }
      // Continue to controller
      ideaController.createIdea(req as AuthRequest, res);
    });
  } else {
    // Regular JSON request - use validation middleware
    validateRequest(CreateIdeaDto)(req, res, () => {
      ideaController.createIdea(req as AuthRequest, res);
    });
  }
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

// Get ideas for Hands-On hackathon (with visibility rules)
router.get('/hackathon/:hackathonId', (req: Request, res: Response) => {
  ideaController.getHandsOnHackathonIdeas(req as AuthRequest, res);
});

router.get('/:id', (req: Request, res: Response) => {
  ideaController.getIdeaById(req as AuthRequest, res);
});

// Update project details for ENHANCEMENTS/IMPLEMENTATION phases
router.patch('/:ideaId/project-details', (req: Request, res: Response) => {
  ideaController.updateProjectDetails(req as AuthRequest, res);
});

// Nested routes for comments and likes
router.use('/:ideaId/comments', commentRoutes);
router.use('/:ideaId/like', likeRoutes);

export default router;

