import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Cliente de Supabase con permisos de administrador
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware para verificar autenticación
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token de autorización requerido' });
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error en autenticación' });
  }
};

// Middleware para verificar si es super admin
const requireSuperAdmin = async (req, res, next) => {
  try {
    const { data: usuario } = await supabaseAdmin
      .from('usuarios')
      .select('rol')
      .eq('auth_uid', req.user.id)
      .single();

    if (!usuario || usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Se requieren permisos de administrador' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Error verificando permisos' });
  }
};

// Usar rutas
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Backend funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📡 Supabase URL: ${process.env.SUPABASE_URL}`);
});

export { supabaseAdmin, authenticateToken, requireSuperAdmin };