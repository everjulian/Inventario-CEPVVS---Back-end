// routes/salidas.routes.js
import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import * as salidasController from '../controllers/salidas.controller.js';

const router = Router();

// Orden correcto: primero rutas específicas
router.get('/ultimo-numero/sugerencia', authenticateToken, salidasController.getSugerencia);

// Rutas CRUD
router.get('/', authenticateToken, salidasController.getAll);
router.get('/:id', authenticateToken, salidasController.getById);
router.post('/', authenticateToken, salidasController.create);
router.delete('/:id', authenticateToken, salidasController.remove);

export default router;
