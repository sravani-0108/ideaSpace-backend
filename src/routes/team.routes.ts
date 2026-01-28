import { Router, Request, Response } from 'express';
import { TeamController } from '../controllers/team.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { AuthRequest } from '../middlewares/auth.middleware';

const router = Router();
const teamController = new TeamController();

router.use(authMiddleware);

router.post('/hackathons/:hackathonId/teams', (req: Request, res: Response) => {
  teamController.createTeam(req as AuthRequest, res);
});

router.get('/hackathons/:hackathonId/teams', (req: Request, res: Response) => {
  teamController.getTeamsByHackathon(req as AuthRequest, res);
});

router.get('/teams/:id', (req: Request, res: Response) => {
  teamController.getTeamById(req as AuthRequest, res);
});

router.get('/teams/:id/members', (req: Request, res: Response) => {
  teamController.getTeamMembers(req as AuthRequest, res);
});

router.post('/teams/:id/members', (req: Request, res: Response) => {
  teamController.addMember(req as AuthRequest, res);
});

router.delete('/teams/:id/members/:userId', (req: Request, res: Response) => {
  teamController.removeMember(req as AuthRequest, res);
});

router.put('/teams/:id', (req: Request, res: Response) => {
  teamController.updateTeam(req as AuthRequest, res);
});

router.delete('/teams/:id', (req: Request, res: Response) => {
  teamController.deleteTeam(req as AuthRequest, res);
});

export default router;

