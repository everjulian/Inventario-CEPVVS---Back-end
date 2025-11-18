import { Router } from 'express';
import { authenticateToken, supabaseAdmin } from '../config.js';

const router = Router();

// Verificar usuario (para login) - CON TU TABLA
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    // Obtener datos de TU tabla 'usuarios'
    const { data: usuario, error } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('auth_uid', req.user.id)
      .single();

    if (error) {
      console.error('Error fetching usuario:', error);
      return res.status(404).json({ error: 'Usuario no encontrado en la base de datos' });
    }

    res.json({
      user: {
        id: usuario.id_usuario,
        auth_uid: req.user.id,
        username: usuario.username,
        email: req.user.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: usuario.rol,
        activo: usuario.activo,
        fecha_creacion: usuario.fecha_creacion
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Obtener perfil de usuario - DESDE TU TABLA
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { data: usuario, error } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('auth_uid', req.user.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ usuario });
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;