import { Router } from 'express';
import { supabaseAdmin, authenticateToken } from '../config.js';

const router = Router();

// GET /api/categorias - Listar todas las categorías
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

// GET /api/categorias/:id - Obtener categoría específica
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('categorias')
      .select('*')
      .eq('id_categoria', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Categoría no encontrada' });

    res.json({ categoria: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;