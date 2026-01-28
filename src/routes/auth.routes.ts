import { Router, Request, Response } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middlewares/validation.middleware';
import { RegisterDto, LoginDto, VerifyEmailDto, ResendOTPDto } from '../dto/auth.dto';

const router = Router();
const authController = new AuthController();

router.post('/register', validateRequest(RegisterDto), (req: Request, res: Response) => {
  authController.register(req, res);
});

router.post('/verify-email', validateRequest(VerifyEmailDto), (req: Request, res: Response) => {
  authController.verifyEmail(req, res);
});

router.post('/login', validateRequest(LoginDto), (req: Request, res: Response) => {
  authController.login(req, res);
});

router.post('/resend-otp', validateRequest(ResendOTPDto), (req: Request, res: Response) => {
  authController.resendOTP(req, res);
});

export default router;

