import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { requireSuperAdmin } from '../middlewares/roles.js';

import * as categoriasController from '../controllers/categorias.controller.js';

const router = Router();

router.get('/', authenticateToken, categoriasController.getAll);

router.post(
  '/',
  authenticateToken,
  requireSuperAdmin,
  categoriasController.create
);

router.put(
  '/:id',
  authenticateToken,
  requireSuperAdmin,
  categoriasController.update
);

router.delete(
  '/:id',
  authenticateToken,
  requireSuperAdmin,
  categoriasController.remove
);

export default router;
