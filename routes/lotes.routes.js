import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import * as lotesController from '../controllers/lotes.controller.js';

const router = Router();

// GET /api/lotes - Listar todos los lotes
router.get('/', authenticateToken, lotesController.getAll);

// GET /api/lotes/producto/:idProducto - Lotes por producto
router.get('/producto/:idProducto', authenticateToken, lotesController.getByProducto);

// GET /api/lotes/:id - Obtener un lote específico
router.get('/:id', authenticateToken, lotesController.getById);

// POST /api/lotes - Crear lote
router.post('/', authenticateToken, lotesController.create);

// PUT /api/lotes/:id - Actualizar lote
router.put('/:id', authenticateToken, lotesController.update);

// DELETE /api/lotes/:id - Eliminar lote
router.delete('/:id', authenticateToken, lotesController.remove);

// GET /api/lotes/alertas/vencimientos - Alertas
router.get('/alertas/vencimientos', authenticateToken, lotesController.getAlertasVencimiento);

export default router;
