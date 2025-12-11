import { Router } from 'express';

import authRoutes from './auth.js';
import adminRoutes from './admin.routes.js';
import productosRoutes from './productos.routes.js';
import lotesRoutes from './lotes.routes.js';
import entradasRoutes from './entradas.routes.js';
import salidasRoutes from './salidas.routes.js';
import categoriasRoutes from './categorias.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/productos', productosRoutes);
router.use('/lotes', lotesRoutes);
router.use('/entradas', entradasRoutes);
router.use('/salidas', salidasRoutes);
router.use('/categorias', categoriasRoutes);

export default router;
