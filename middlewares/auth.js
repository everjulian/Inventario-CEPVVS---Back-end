// middlewares/auth.js
import { supabaseAnon } from '../config/supabase.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token de autorización requerido' });
    }

    // Validar token usando el cliente ANON
    const { data, error } = await supabaseAnon.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // Guardar el usuario decodificado
    req.user = data.user;
    next();
  } catch (err) {
    console.error('Error en authenticateToken:', err);
    res.status(500).json({ error: 'Error interno de autenticación' });
  }
};
