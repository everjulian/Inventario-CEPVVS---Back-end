// routes/auth.js
import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { verifyUser, getUserProfile } from '../controllers/auth.controller.js';

const router = Router();

router.get('/verify', authenticateToken, verifyUser);
router.get('/profile', authenticateToken, getUserProfile);

export default router;
