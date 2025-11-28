import { Router } from 'express';
import { supabaseAdmin, authenticateToken } from '../config.js';

const router = Router();

// GET /api/productos - Listar todos los productos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('productos')
      .select(`
        *,
        categorias: categoria_id (*),
        usuarios:id_usuario_creador (username, nombre, apellido)
      `)
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;

    res.json({ productos: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/productos/:id - Obtener un producto específico
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('productos')
      .select(`
        *,
        categorias: categoria_id (*),
        usuarios:id_usuario_creador (username, nombre, apellido),
        lotes (*)
      `)
      .eq('id_producto', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Producto no encontrado' });

    res.json({ producto: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/productos - Crear producto
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { codigo, nombre_articulo, descripcion, activo = true, categoria_id } = req.body;

    // ✅ VALIDACIONES
    if (!codigo || !nombre_articulo || !categoria_id) {
      return res.status(400).json({ 
        error: 'Código, nombre y categoría son requeridos' 
      });
    }

    // ✅ VALIDAR CATEGORÍA EXISTENTE
    const { data: categoria, error: catError } = await supabaseAdmin
      .from('categorias')
      .select('id_categoria')
      .eq('id_categoria', categoria_id)
      .single();

    if (catError || !categoria) {
      return res.status(400).json({ error: 'La categoría no existe' });
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
      .from('productos')
      .insert([
        {
          codigo,
          nombre_articulo,
          descripcion,
          activo,
          categoria_id,
          id_usuario_creador: usuario.id_usuario
        }
      ])
      .select(`
        *,
        categorias: categoria_id (*)
      `)
      .single();

    if (error) throw error;

    res.status(201).json({ producto: data });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'El código del producto ya existe' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/productos/:id - Actualizar producto
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, nombre_articulo, descripcion, activo, categoria_id } = req.body;

    // ✅ VALIDAR CATEGORÍA SI SE ESTÁ ACTUALIZANDO
    if (categoria_id) {
      const { data: categoria, error: catError } = await supabaseAdmin
        .from('categorias')
        .select('id_categoria')
        .eq('id_categoria', categoria_id)
        .single();

      if (catError || !categoria) {
        return res.status(400).json({ error: 'La categoría no existe' });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('productos')
      .update({
        codigo,
        nombre_articulo,
        descripcion,
        activo,
        categoria_id,
        fecha_actualizacion: new Date()
      })
      .eq('id_producto', id)
      .select(`
        *,
        categorias: categoria_id (*)
      `)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Producto no encontrado' });

    res.json({ producto: data });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'El código del producto ya existe' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/productos/:id - Eliminar producto (solo si no tiene lotes)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el producto tiene lotes
    const { data: lotes, error: lotesError } = await supabaseAdmin
      .from('lotes')
      .select('id_lote')
      .eq('id_producto', id);

    if (lotesError) throw lotesError;
    if (lotes.length > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el producto porque tiene lotes asociados' 
      });
    }

    const { error } = await supabaseAdmin
      .from('productos')
      .delete()
      .eq('id_producto', id);

    if (error) throw error;

    res.json({ success: true, message: 'Producto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;