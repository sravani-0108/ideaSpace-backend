import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const notificationController = new NotificationController();

// All notification routes require authentication
router.use(authMiddleware);

router.get('/', (req, res) => notificationController.getNotifications(req, res));
router.get('/unread-count', (req, res) => notificationController.getUnreadCount(req, res));
router.patch('/:id/read', (req, res) => notificationController.markAsRead(req, res));
router.patch('/read-all', (req, res) => notificationController.markAllAsRead(req, res));

export default router;

