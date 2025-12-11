// routes/productos.routes.js
import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import * as productosController from '../controllers/productos.controller.js';

const router = Router();

// Endpoints principales
router.get('/', authenticateToken, productosController.getAll);
router.get('/:id', authenticateToken, productosController.getById);
router.post('/', authenticateToken, productosController.create);
router.put('/:id', authenticateToken, productosController.update);
router.delete('/:id', authenticateToken, productosController.remove);

// Endpoints especiales
router.get('/inventario/stock', authenticateToken, productosController.getInventarioStock);

export default router;
