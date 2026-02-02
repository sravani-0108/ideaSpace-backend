import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const projectController = new ProjectController();

// All routes require authentication
router.use(authMiddleware);

// Submit project for an idea
router.post('/:ideaId/submit', (req, res) => projectController.submitProject(req as any, res));

// Review project (Admin/Judge only)
router.put('/:projectId/review', (req, res) => projectController.reviewProject(req as any, res));

// Get project by idea ID
router.get('/idea/:ideaId', (req, res) => projectController.getProjectByIdea(req as any, res));

// Get all projects for a hackathon
router.get('/hackathon/:hackathonId', (req, res) => projectController.getProjectsByHackathon(req as any, res));

// Get projects needing review (Admin/Judge only) - must come before /:projectId
router.get('/review/pending', (req, res) => projectController.getProjectsNeedingReview(req as any, res));

// Get all projects (Admin/Judge only)
router.get('/', (req, res) => projectController.getAllProjects(req as any, res));

// Get project by ID - must be last to avoid conflicts
router.get('/:projectId', (req, res) => projectController.getProjectById(req as any, res));

export default router;

