import { Router } from 'express';

import authRoutes from './auth.js';
import adminRoutes from './admin.js';
import productosRoutes from './productos.js';
import lotesRoutes from './lotes.js';
import entradasRoutes from './entradas.js';
import salidasRoutes from './salidas.js';
import categoriasRoutes from './categorias.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/productos', productosRoutes);
router.use('/lotes', lotesRoutes);
router.use('/entradas', entradasRoutes);
router.use('/salidas', salidasRoutes);
router.use('/categorias', categoriasRoutes);

export default router;
