import { Router } from 'express';
import { supabaseAdmin, authenticateToken } from '../config.js';

const router = Router();

// GET /api/entradas - Listar todas las entradas
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('entradas')
      .select(`
        *,
        usuarios:id_usuario_registrador (username, nombre, apellido),
        detalle_entradas (
          *,
          lotes (
            *,
            productos (*)
          )
        )
      `)
      .order('fecha_entrada', { ascending: false });

    if (error) throw error;

    res.json({ entradas: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/entradas/:id - Obtener una entrada específica
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('entradas')
      .select(`
        *,
        usuarios:id_usuario_registrador (username, nombre, apellido),
        detalle_entradas (
          *,
          lotes (
            *,
            productos (*)
          )
        )
      `)
      .eq('id_entrada', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Entrada no encontrada' });

    res.json({ entrada: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/entradas - Crear nueva entrada con detalles
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { 
      numero_acta, 
      fecha_entrada, 
      proveedor, 
      archivo_acta,
      detalles 
    } = req.body;

    // Validaciones
    if (!numero_acta || !fecha_entrada || !proveedor || !detalles || !Array.isArray(detalles)) {
      return res.status(400).json({ 
        error: 'Número de acta, fecha, proveedor y detalles son requeridos' 
      });
    }

    if (detalles.length === 0) {
      return res.status(400).json({ 
        error: 'Debe incluir al menos un producto en los detalles' 
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

    // 1. Crear la entrada principal
    const { data: entrada, error: entradaError } = await supabaseAdmin
      .from('entradas')
      .insert([
        {
          numero_acta,
          fecha_entrada,
          proveedor,
          archivo_acta,
          id_usuario_registrador: usuario.id_usuario
        }
      ])
      .select()
      .single();

    if (entradaError) throw entradaError;

    // 2. Crear los detalles de la entrada
    const detallesConEntrada = detalles.map(detalle => ({
      ...detalle,
      id_entrada: entrada.id_entrada,
      id_usuario_registrador: usuario.id_usuario
    }));

    const { data: detallesData, error: detallesError } = await supabaseAdmin
      .from('detalle_entradas')
      .insert(detallesConEntrada)
      .select(`
        *,
        lotes (
          *,
          productos (*)
        )
      `);

    if (detallesError) {
      // Si fallan los detalles, eliminar la entrada principal
      await supabaseAdmin.from('entradas').delete().eq('id_entrada', entrada.id_entrada);
      throw detallesError;
    }

    // 3. Obtener la entrada completa con detalles
    const { data: entradaCompleta, error: errorCompleta } = await supabaseAdmin
      .from('entradas')
      .select(`
        *,
        usuarios:id_usuario_registrador (username, nombre, apellido),
        detalle_entradas (
          *,
          lotes (
            *,
            productos (*)
          )
        )
      `)
      .eq('id_entrada', entrada.id_entrada)
      .single();

    if (errorCompleta) throw errorCompleta;

    res.status(201).json({ 
      entrada: entradaCompleta,
      message: 'Entrada registrada exitosamente'
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'El número de acta ya existe' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Uno de los lotes no existe' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/entradas/:id - Eliminar entrada (y sus detalles en cascada)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si la entrada existe
    const { data: entrada, error: entradaError } = await supabaseAdmin
      .from('entradas')
      .select('id_entrada')
      .eq('id_entrada', id)
      .single();

    if (entradaError) {
      return res.status(404).json({ error: 'Entrada no encontrada' });
    }

    // Eliminar la entrada (los detalles se eliminan en cascada por el CASCADE)
    const { error } = await supabaseAdmin
      .from('entradas')
      .delete()
      .eq('id_entrada', id);

    if (error) throw error;

    res.json({ 
      success: true, 
      message: 'Entrada eliminada correctamente' 
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/entradas/ultimo-numero - Obtener sugerencia para próximo número de acta
router.get('/ultimo-numero/sugerencia', authenticateToken, async (req, res) => {
  try {
    const añoActual = new Date().getFullYear();
    
    const { data, error } = await supabaseAdmin
      .from('entradas')
      .select('numero_acta')
      .like('numero_acta', `ACT-${añoActual}-%`)
      .order('numero_acta', { ascending: false })
      .limit(1);

    if (error) throw error;

    let siguienteNumero = 1;
    
    if (data && data.length > 0) {
      const ultimoNumero = data[0].numero_acta;
      const matches = ultimoNumero.match(/ACT-\d+-(\d+)/);
      if (matches && matches[1]) {
        siguienteNumero = parseInt(matches[1]) + 1;
      }
    }

    const sugerencia = `ACT-${añoActual}-${siguienteNumero.toString().padStart(3, '0')}`;
    
    res.json({ sugerencia });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;