import { Router } from 'express';
import { getCurrentUser, login, registerUser } from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/register', authenticate, authorize('ADMIN'), registerUser);
router.get('/me', authenticate, getCurrentUser);

export default router;
