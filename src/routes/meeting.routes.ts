import { Router, Request, Response } from 'express';
import { MeetingController } from '../controllers/meeting.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { AuthRequest } from '../middlewares/auth.middleware';

const router = Router();
const meetingController = new MeetingController();

router.use(authMiddleware);

router.post('/hackathons/:hackathonId/meetings', (req: Request, res: Response) => {
  meetingController.createMeeting(req as AuthRequest, res);
});

router.get('/hackathons/:hackathonId/meetings', (req: Request, res: Response) => {
  meetingController.getHackathonMeetings(req as AuthRequest, res);
});

router.get('/teams/:teamId/meetings', (req: Request, res: Response) => {
  meetingController.getTeamMeetings(req as AuthRequest, res);
});

router.get('/meetings', (req: Request, res: Response) => {
  meetingController.getUserMeetings(req as AuthRequest, res);
});

router.put('/meetings/:id', (req: Request, res: Response) => {
  meetingController.updateMeeting(req as AuthRequest, res);
});

router.delete('/meetings/:id', (req: Request, res: Response) => {
  meetingController.deleteMeeting(req as AuthRequest, res);
});

export default router;

