import { Router, Request, Response } from 'express';
import { HackathonController } from '../controllers/hackathon.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { AuthRequest } from '../middlewares/auth.middleware';
import { UserRole } from '../enums/UserRole';

const router = Router();
const hackathonController = new HackathonController();

// All hackathon routes require authentication
router.use(authMiddleware);

// Middleware to check admin role
const adminOnly = (req: Request, res: Response, next: any) => {
  const authReq = req as AuthRequest;
  if (authReq.user?.role !== UserRole.ADMIN) {
    return res.status(403).json({
      success: false,
      message: 'Only admins can access hackathon management',
    });
  }
  next();
};

router.post('/', adminOnly, (req: Request, res: Response) => {
  hackathonController.createHackathon(req as AuthRequest, res);
});

router.get('/', (req: Request, res: Response) => {
  hackathonController.getAllHackathons(req as AuthRequest, res);
});

router.get('/next', (req: Request, res: Response) => {
  hackathonController.getNextHackathon(req as AuthRequest, res);
});

router.get('/:id', (req: Request, res: Response) => {
  hackathonController.getHackathonById(req as AuthRequest, res);
});

router.put('/:id', adminOnly, (req: Request, res: Response) => {
  hackathonController.updateHackathon(req as AuthRequest, res);
});

router.patch('/:id/status', adminOnly, (req: Request, res: Response) => {
  hackathonController.updateStatus(req as AuthRequest, res);
});

router.delete('/:id', adminOnly, (req: Request, res: Response) => {
  hackathonController.deleteHackathon(req as AuthRequest, res);
});

router.post('/:id/send-reminders', adminOnly, (req: Request, res: Response) => {
  hackathonController.sendReminders(req as AuthRequest, res);
});

export default router;

