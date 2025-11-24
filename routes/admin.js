import { Router } from 'express';
import { authenticateToken, requireSuperAdmin, supabaseAdmin } from '../config.js';

const router = Router();

// Crear nuevo usuario (Solo Admin) - ADAPTADO PARA TU TABLA
router.post('/users', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { 
      email, 
      password, 
      username, 
      nombre, 
      apellido, 
      rol = 'usuario' 
    } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ 
        error: 'Email, password y username son requeridos' 
      });
    }

    // 1. Crear usuario en Auth de Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // 2. Crear usuario en TU tabla 'usuarios'
    const { data: usuarioData, error: usuarioError } = await supabaseAdmin
      .from('usuarios')
      .insert([
        {
          username: username,
          email: email,
          password_hash: 'auth_managed', // Supabase maneja el password
          nombre: nombre || '',
          apellido: apellido || '',
          rol: rol,
          activo: true,
          fecha_creacion: new Date(),
          auth_uid: authData.user.id  // Conectar con Auth
        }
      ]);

    if (usuarioError) {
      // Si falla crear en tu tabla, eliminar el usuario de auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({ error: usuarioError.message });
    }

    res.json({
      success: true,
      user: {
        id: authData.user.id,
        username: username,
        email: email,
        nombre: nombre,
        apellido: apellido,
        rol: rol,
        auth_uid: authData.user.id
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Listar todos los usuarios (Solo Admin) - DESDE TU TABLA
router.get('/users', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { data: usuarios, error } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ users: usuarios });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar usuario (Solo Admin) - DE AMBAS TABLAS
// router.delete('/users/:userId', authenticateToken, requireSuperAdmin, async (req, res) => {
//   try {
//     const { userId } = req.params;

//     // 1. Buscar el auth_uid en tu tabla
//     const { data: usuario, error: findError } = await supabaseAdmin
//       .from('usuarios')
//       .select('auth_uid')
//       .eq('id_usuario', userId)
//       .single();

//     if (findError) {
//       return res.status(404).json({ error: 'Usuario no encontrado' });
//     }

//     // 2. Eliminar de TU tabla 'usuarios'
//     const { error: usuarioError } = await supabaseAdmin
//       .from('usuarios')
//       .delete()
//       .eq('id_usuario', userId);

//     if (usuarioError) {
//       console.error('Error eliminando de tabla usuarios:', usuarioError);
//     }

//     // 3. Eliminar usuario de Auth (si tiene auth_uid)
//     if (usuario.auth_uid) {
//       const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(usuario.auth_uid);

//       if (authError) {
//         console.error('Error eliminando de auth:', authError);
//       }
//     }

//     res.json({ 
//       success: true, 
//       message: 'Usuario eliminado correctamente' 
//     });

//   } catch (error) {
//     res.status(500).json({ error: 'Error interno del servidor' });
//   }
// });

// PUT /api/admin/users/:userId/deactivate - Desactivar usuario
router.put('/users/:userId/deactivate', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verificar que no es el usuario actual
    const { data: usuarioActual } = await supabaseAdmin
      .from('usuarios')
      .select('id_usuario')
      .eq('auth_uid', req.user.id)
      .single();

    if (usuarioActual && parseInt(userId) === usuarioActual.id_usuario) {
      return res.status(400).json({ 
        error: 'No puedes desactivar tu propio usuario' 
      });
    }

    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .update({ 
        activo: false
      })
      .eq('id_usuario', userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json({ 
      success: true, 
      message: 'Usuario desactivado correctamente',
      user: data
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/users/:userId/activate - Reactivar usuario
router.put('/users/:userId/activate', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .update({ 
        activo: true
      })
      .eq('id_usuario', userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json({ 
      success: true, 
      message: 'Usuario activado correctamente',
      user: data
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;