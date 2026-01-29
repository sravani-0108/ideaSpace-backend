import { Router } from 'express';
import authRoutes from './auth.routes';
import ideaRoutes from './idea.routes';
import adminRoutes from './admin.routes';
import notificationRoutes from './notification.routes';
import savedIdeaRoutes from './savedIdea.routes';
import hackathonRoutes from './hackathon.routes';
import registrationRoutes from './registration.routes';
import teamRoutes from './team.routes';
import meetingRoutes from './meeting.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/ideas', ideaRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/', savedIdeaRoutes);
router.use('/hackathons', hackathonRoutes);
router.use('/', registrationRoutes);
router.use('/', teamRoutes);
router.use('/', meetingRoutes);
router.use('/users', userRoutes);

export default router;

