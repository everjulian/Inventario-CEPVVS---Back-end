// categorias.js - BACKEND
import { Router } from 'express';
import { supabaseAdmin, authenticateToken, requireSuperAdmin } from '../config.js'; // 👈 Importar requireSuperAdmin

const router = Router();

// GET /api/categorias - Listar todas las categorías (todos los usuarios autenticados pueden ver)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('categorias')
      .select('*')
      .order('nombre');

    if (error) throw error;

    res.json({ categorias: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/categorias - Crear categoría (SOLO SUPER ADMIN)
router.post('/', authenticateToken, requireSuperAdmin, async (req, res) => { // 👈 Agregar requireSuperAdmin
  try {
    const { nombre, descripcion, activo = true } = req.body;

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
    }

    const { data, error } = await supabaseAdmin
      .from('categorias')
      .insert([
        {
          nombre: nombre.trim(),
          descripcion: descripcion ? descripcion.trim() : null,
          activo
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ categoria: data });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ya existe una categoría con este nombre' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/categorias/:id - Actualizar categoría (SOLO SUPER ADMIN)
router.put('/:id', authenticateToken, requireSuperAdmin, async (req, res) => { // 👈 Agregar requireSuperAdmin
  try {
    const { id } = req.params;
    const { nombre, descripcion, activo } = req.body;

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
    }

    const { data, error } = await supabaseAdmin
      .from('categorias')
      .update({
        nombre: nombre.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        activo,
        fecha_actualizacion: new Date()
      })
      .eq('id_categoria', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Categoría no encontrada' });

    res.json({ categoria: data });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ya existe una categoría con este nombre' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/categorias/:id - Eliminar categoría (SOLO SUPER ADMIN)
router.delete('/:id', authenticateToken, requireSuperAdmin, async (req, res) => { // 👈 Agregar requireSuperAdmin
  try {
    const { id } = req.params;

    // Verificar si la categoría tiene productos asociados
    const { data: productos, error: productosError } = await supabaseAdmin
      .from('productos')
      .select('id_producto')
      .eq('categoria_id', id)
      .limit(1);

    if (productosError) throw productosError;
    if (productos.length > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar la categoría porque tiene productos asociados' 
      });
    }

    const { error } = await supabaseAdmin
      .from('categorias')
      .delete()
      .eq('id_categoria', id);

    if (error) throw error;

    res.json({ success: true, message: 'Categoría eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;