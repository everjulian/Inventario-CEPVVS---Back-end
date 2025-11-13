import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware para verificar autenticación
export const authenticateToken = async (req, res, next) => {
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

// Middleware para verificar si es admin
export const requireSuperAdmin = async (req, res, next) => {
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

export { supabaseAdmin };