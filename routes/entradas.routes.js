// routes/entradas.routes.js
import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import * as entradasController from '../controllers/entradas.controller.js';

const router = Router();

// Listar todas las entradas
router.get('/', authenticateToken, entradasController.getAll);

// Obtener entrada por ID
router.get('/:id', authenticateToken, entradasController.getById);

// Crear nueva entrada
router.post('/', authenticateToken, entradasController.create);

// Eliminar entrada
router.delete('/:id', authenticateToken, entradasController.remove);

// Sugerencia número de acta
router.get('/ultimo-numero/sugerencia', authenticateToken, entradasController.getSugerencia);

export default router;
