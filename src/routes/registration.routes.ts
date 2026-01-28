import { Router, Request, Response } from 'express';
import { RegistrationController } from '../controllers/registration.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { AuthRequest } from '../middlewares/auth.middleware';

const router = Router();
const registrationController = new RegistrationController();

router.use(authMiddleware);

router.post('/hackathons/:hackathonId/register', (req: Request, res: Response) => {
  registrationController.register(req as AuthRequest, res);
});

router.delete('/hackathons/:hackathonId/register', (req: Request, res: Response) => {
  registrationController.unregister(req as AuthRequest, res);
});

router.get('/hackathons/:hackathonId/registrations', (req: Request, res: Response) => {
  registrationController.getHackathonRegistrations(req as AuthRequest, res);
});

router.get('/registrations', (req: Request, res: Response) => {
  registrationController.getUserRegistrations(req as AuthRequest, res);
});

router.get('/hackathons/:hackathonId/registration-status', (req: Request, res: Response) => {
  registrationController.checkRegistrationStatus(req as AuthRequest, res);
});

export default router;

