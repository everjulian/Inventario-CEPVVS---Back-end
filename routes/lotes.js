import { Router } from 'express';
import { supabaseAdmin, authenticateToken } from '../config.js';

const router = Router();

// GET /api/lotes - Listar todos los lotes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('lotes')
      .select(`
        *,
        productos (*),
        usuarios:id_usuario_creador (username, nombre, apellido)
      `)
      .order('fecha_vencimiento', { ascending: true });

    if (error) throw error;

    res.json({ lotes: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lotes/producto/:idProducto - Listar lotes por producto
router.get('/producto/:idProducto', authenticateToken, async (req, res) => {
  try {
    const { idProducto } = req.params;

    const { data, error } = await supabaseAdmin
      .from('lotes')
      .select(`
        *,
        productos (*),
        usuarios:id_usuario_creador (username, nombre, apellido)
      `)
      .eq('id_producto', idProducto)
      .order('fecha_vencimiento', { ascending: true });

    if (error) throw error;

    res.json({ lotes: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lotes/:id - Obtener un lote específico
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('lotes')
      .select(`
        *,
        productos (*),
        usuarios:id_usuario_creador (username, nombre, apellido)
      `)
      .eq('id_lote', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Lote no encontrado' });

    res.json({ lote: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/lotes - Crear nuevo lote
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { 
      id_producto, 
      numero_lote, 
      fecha_vencimiento, 
      cantidad_inicial 
    } = req.body;

    if (!id_producto || !numero_lote || !fecha_vencimiento || !cantidad_inicial) {
      return res.status(400).json({ 
        error: 'Todos los campos son requeridos' 
      });
    }

    // Validar que la fecha de vencimiento sea futura
    const vencimiento = new Date(fecha_vencimiento);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    if (vencimiento <= hoy) {
      return res.status(400).json({ 
        error: 'La fecha de vencimiento debe ser futura' 
      });
    }

    // Validar que la cantidad sea positiva
    if (cantidad_inicial <= 0) {
      return res.status(400).json({ 
        error: 'La cantidad inicial debe ser mayor a 0' 
      });
    }

    // Obtener el id_usuario del usuario autenticado
    const { data: usuario } = await supabaseAdmin
      .from('usuarios')
      .select('id_usuario')
      .eq('auth_uid', req.user.id)
      .single();

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { data, error } = await supabaseAdmin
      .from('lotes')
      .insert([
        {
          id_producto,
          numero_lote,
          fecha_vencimiento,
          cantidad_inicial,
          stock_actual: cantidad_inicial, // Al crear, stock = cantidad inicial
          id_usuario_creador: usuario.id_usuario
        }
      ])
      .select(`
        *,
        productos (*),
        usuarios:id_usuario_creador (username, nombre, apellido)
      `)
      .single();

    if (error) throw error;

    res.status(201).json({ lote: data });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'El número de lote ya existe' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ error: 'El producto seleccionado no existe' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/lotes/:id - Actualizar lote (solo algunos campos)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { numero_lote, fecha_vencimiento, estado } = req.body;

    // Validar fecha de vencimiento si se está actualizando
    if (fecha_vencimiento) {
      const vencimiento = new Date(fecha_vencimiento);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      if (vencimiento <= hoy) {
        return res.status(400).json({ 
          error: 'La fecha de vencimiento debe ser futura' 
        });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('lotes')
      .update({
        numero_lote,
        fecha_vencimiento,
        estado,
      })
      .eq('id_lote', id)
      .select(`
        *,
        productos (*)
      `)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Lote no encontrado' });

    res.json({ lote: data });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'El número de lote ya existe' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/lotes/:id - Eliminar lote (solo si no tiene movimientos)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el lote tiene stock (podría tener movimientos)
    const { data: lote, error: loteError } = await supabaseAdmin
      .from('lotes')
      .select('stock_actual, cantidad_inicial')
      .eq('id_lote', id)
      .single();

    if (loteError) throw loteError;

    // Solo permitir eliminar si el stock es igual a la cantidad inicial (no ha tenido movimientos)
    if (lote.stock_actual !== lote.cantidad_inicial) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el lote porque tiene movimientos de stock' 
      });
    }

    const { error } = await supabaseAdmin
      .from('lotes')
      .delete()
      .eq('id_lote', id);

    if (error) throw error;

    res.json({ success: true, message: 'Lote eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lotes/alertas/vencimientos - Lotes próximos a vencer
router.get('/alertas/vencimientos', authenticateToken, async (req, res) => {
  try {
    const { dias = 30 } = req.query; // Por defecto 30 días

    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + parseInt(dias));

    const { data, error } = await supabaseAdmin
      .from('lotes')
      .select(`
        *,
        productos (*)
      `)
      .gte('fecha_vencimiento', new Date().toISOString().split('T')[0]) // No vencidos aún
      .lte('fecha_vencimiento', fechaLimite.toISOString().split('T')[0]) // Se vencen en los próximos X días
      .eq('estado', 'disponible')
      .order('fecha_vencimiento', { ascending: true });

    if (error) throw error;

    res.json({ lotes: data, total: data.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;