import { Router } from 'express';
import { supabaseAdmin, authenticateToken } from '../config.js';

const router = Router();

// GET /api/salidas - Listar todas las salidas
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('salidas')
      .select(`
        *,
        usuarios:id_usuario_registrador (username, nombre, apellido),
        detalle_salidas (
          *,
          lotes (
            *,
            productos (*)
          )
        )
      `)
      .order('fecha_salida', { ascending: false });

    if (error) throw error;

    res.json({ salidas: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/salidas/:id - Obtener una salida específica
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('salidas')
      .select(`
        *,
        usuarios:id_usuario_registrador (username, nombre, apellido),
        detalle_salidas (
          *,
          lotes (
            *,
            productos (*)
          )
        )
      `)
      .eq('id_salida', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Salida no encontrada' });

    res.json({ salida: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/salidas - Crear nueva salida con detalles
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { 
      numero_acta_salida, 
      fecha_salida, 
      beneficiario, 
      lugar_salida,
      detalles 
    } = req.body;

    // Validaciones
    if (!numero_acta_salida || !fecha_salida || !beneficiario || !detalles || !Array.isArray(detalles)) {
      return res.status(400).json({ 
        error: 'Número de acta, fecha, beneficiario y detalles son requeridos' 
      });
    }

    if (detalles.length === 0) {
      return res.status(400).json({ 
        error: 'Debe incluir al menos un producto en los detalles' 
      });
    }

    // Validar stock disponible para cada lote
    for (const detalle of detalles) {
      const { data: lote, error: loteError } = await supabaseAdmin
        .from('lotes')
        .select('stock_actual, numero_lote, productos(nombre_articulo)')
        .eq('id_lote', detalle.id_lote)
        .single();

      if (loteError) {
        return res.status(400).json({ error: `Lote no encontrado: ${detalle.id_lote}` });
      }

      if (lote.stock_actual < detalle.cantidad) {
        return res.status(400).json({ 
          error: `Stock insuficiente en lote ${lote.numero_lote}. Disponible: ${lote.stock_actual}, Solicitado: ${detalle.cantidad}`
        });
      }
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

    // 1. Crear la salida principal
    const { data: salida, error: salidaError } = await supabaseAdmin
      .from('salidas')
      .insert([
        {
          numero_acta_salida,
          fecha_salida,
          beneficiario,
          lugar_salida,
          id_usuario_registrador: usuario.id_usuario
        }
      ])
      .select()
      .single();

    if (salidaError) throw salidaError;

    // 2. Crear los detalles de la salida
    const detallesConSalida = detalles.map(detalle => ({
      ...detalle,
      id_salida: salida.id_salida,
      id_usuario_registrador: usuario.id_usuario
    }));

    const { data: detallesData, error: detallesError } = await supabaseAdmin
      .from('detalle_salidas')
      .insert(detallesConSalida)
      .select(`
        *,
        lotes (
          *,
          productos (*)
        )
      `);

    if (detallesError) {
      // Si fallan los detalles, eliminar la salida principal
      await supabaseAdmin.from('salidas').delete().eq('id_salida', salida.id_salida);
      throw detallesError;
    }

    // 3. Obtener la salida completa con detalles
    const { data: salidaCompleta, error: errorCompleta } = await supabaseAdmin
      .from('salidas')
      .select(`
        *,
        usuarios:id_usuario_registrador (username, nombre, apellido),
        detalle_salidas (
          *,
          lotes (
            *,
            productos (*)
          )
        )
      `)
      .eq('id_salida', salida.id_salida)
      .single();

    if (errorCompleta) throw errorCompleta;

    res.status(201).json({ 
      salida: salidaCompleta,
      message: 'Salida registrada exitosamente'
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

// DELETE /api/salidas/:id - Eliminar salida (y sus detalles en cascada)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si la salida existe
    const { data: salida, error: salidaError } = await supabaseAdmin
      .from('salidas')
      .select('id_salida')
      .eq('id_salida', id)
      .single();

    if (salidaError) {
      return res.status(404).json({ error: 'Salida no encontrada' });
    }

    // Eliminar la salida (los detalles se eliminan en cascada por el CASCADE)
    const { error } = await supabaseAdmin
      .from('salidas')
      .delete()
      .eq('id_salida', id);

    if (error) throw error;

    res.json({ 
      success: true, 
      message: 'Salida eliminada correctamente' 
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/salidas/ultimo-numero - Obtener sugerencia para próximo número de acta
router.get('/ultimo-numero/sugerencia', authenticateToken, async (req, res) => {
  try {
    const añoActual = new Date().getFullYear();
    
    const { data, error } = await supabaseAdmin
      .from('salidas')
      .select('numero_acta_salida')
      .like('numero_acta_salida', `SAL-${añoActual}-%`)
      .order('numero_acta_salida', { ascending: false })
      .limit(1);

    if (error) throw error;

    let siguienteNumero = 1;
    
    if (data && data.length > 0) {
      const ultimoNumero = data[0].numero_acta_salida;
      const matches = ultimoNumero.match(/SAL-\d+-(\d+)/);
      if (matches && matches[1]) {
        siguienteNumero = parseInt(matches[1]) + 1;
      }
    }

    const sugerencia = `SAL-${añoActual}-${siguienteNumero.toString().padStart(3, '0')}`;
    
    res.json({ sugerencia });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;