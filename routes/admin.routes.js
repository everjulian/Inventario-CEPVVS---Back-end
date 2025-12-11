// routes/admin.routes.js
import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { requireSuperAdmin } from '../middlewares/roles.js';

import * as adminController from '../controllers/admin.controller.js';

const router = Router();

router.post('/users', authenticateToken, requireSuperAdmin, adminController.createUser);

router.get('/users', authenticateToken, requireSuperAdmin, adminController.getUsers);

router.put('/users/:userId/deactivate', authenticateToken, requireSuperAdmin, adminController.deactivate);

router.put('/users/:userId/activate', authenticateToken, requireSuperAdmin, adminController.activate);

export default router;
