import { supabaseAdmin } from '../config/supabase.js';

// ====================================================
// Helpers
// ====================================================

const calcularEstadoLote = (lote) => {
  const hoy = new Date();
  const fechaVenc = new Date(lote.fecha_vencimiento);
  const dias = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));

  let estadoFinal = lote.estado;

  if (lote.stock_actual <= 0) {
    estadoFinal = 'agotado';
  } else {
    if (dias < 0) {
      estadoFinal = 'vencido';
    } else if (dias <= 30) {
      estadoFinal = lote.estado === 'disponible' ? 'disponible' : 'por_vencer';
    } else {
      estadoFinal = 'disponible';
    }
  }

  return {
    ...lote,
    estado: estadoFinal,
    dias_hasta_vencimiento: dias,
    estado_vencimiento:
      dias < 0 ? 'vencido' : dias <= 30 ? 'por_vencer' : 'vigente',
  };
};

// ====================================================
// SERVICE: GET ALL LOTES
// ====================================================

export const getAll = async () => {
  const { data, error } = await supabaseAdmin
    .from('lotes')
    .select(
      `
      *,
      productos (*),
      usuarios:id_usuario_creador (username, nombre, apellido)
    `
    )
    .order('fecha_vencimiento', { ascending: true });

  if (error) throw error;

  return data.map(calcularEstadoLote);
};

// ====================================================
// SERVICE: GET LOTES BY PRODUCT
// ====================================================

export const getByProducto = async (idProducto) => {
  const { data, error } = await supabaseAdmin
    .from('lotes')
    .select(
      `
        *,
        productos (*),
        usuarios:id_usuario_creador (username, nombre, apellido)
    `
    )
    .eq('id_producto', idProducto)
    .order('fecha_vencimiento', { ascending: true });

  if (error) throw error;

  return data.map(calcularEstadoLote);
};

// ====================================================
// SERVICE: GET LOTE BY ID
// ====================================================

export const getById = async (id) => {
  const { data, error } = await supabaseAdmin
    .from('lotes')
    .select(
      `
      *,
      productos (*),
      usuarios:id_usuario_creador (username, nombre, apellido)
    `
    )
    .eq('id_lote', id)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Lote no encontrado');

  return calcularEstadoLote(data);
};

// ====================================================
// SERVICE: CREATE LOTE
// ====================================================

export const create = async (body, user) => {
  const {
    id_producto,
    numero_lote,
    fecha_vencimiento,
    cantidad_inicial,
  } = body;

  if (!id_producto || !numero_lote || !fecha_vencimiento || !cantidad_inicial) {
    throw new Error('Todos los campos son requeridos');
  }

  // Fecha válida
  const fecha = new Date(fecha_vencimiento);
  if (isNaN(fecha.getTime())) {
    throw new Error('Fecha de vencimiento inválida');
  }

  // No fecha pasada
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (fecha < hoy) {
    throw new Error('La fecha de vencimiento no puede ser anterior a hoy');
  }

  if (cantidad_inicial <= 0) {
    throw new Error('La cantidad inicial debe ser mayor a 0');
  }

  // Obtener id_usuario desde auth_uid
  const { data: usuario, error: usuarioErr } = await supabaseAdmin
    .from('usuarios')
    .select('id_usuario')
    .eq('auth_uid', user.id)
    .single();

  if (usuarioErr || !usuario) {
    throw new Error('Usuario no encontrado');
  }

  const { data, error } = await supabaseAdmin
    .from('lotes')
    .insert([
      {
        id_producto,
        numero_lote,
        fecha_vencimiento,
        cantidad_inicial,
        stock_actual: cantidad_inicial,
        id_usuario_creador: usuario.id_usuario,
      },
    ])
    .select(
      `
      *,
      productos (*),
      usuarios:id_usuario_creador (username, nombre, apellido)
    `
    )
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('El número de lote ya existe');
    }
    if (error.code === '23503') {
      throw new Error('El producto seleccionado no existe');
    }
    throw error;
  }

  return calcularEstadoLote(data);
};

// ====================================================
// SERVICE: UPDATE LOTE
// ====================================================

export const update = async (id, body) => {
  const { numero_lote, fecha_vencimiento, estado } = body;

  // Validación de fecha
  if (fecha_vencimiento) {
    const fecha = new Date(fecha_vencimiento);
    if (isNaN(fecha.getTime())) {
      throw new Error('Fecha de vencimiento inválida');
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fecha < hoy) {
      throw new Error(
        'La fecha de vencimiento no puede ser anterior a hoy'
      );
    }
  }

  const { data, error } = await supabaseAdmin
    .from('lotes')
    .update({ numero_lote, fecha_vencimiento, estado })
    .eq('id_lote', id)
    .select(
      `
        *,
        productos (*)
      `
    )
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('El número de lote ya existe');
    }
    throw error;
  }

  if (!data) throw new Error('Lote no encontrado');

  return calcularEstadoLote(data);
};

// ====================================================
// SERVICE: DELETE LOTE
// ====================================================

export const remove = async (id, isAdmin = false) => {
  // Verificar movimientos
  const { data: lote, error: err } = await supabaseAdmin
    .from('lotes')
    .select('stock_actual, cantidad_inicial')
    .eq('id_lote', id)
    .single();

  if (err) throw err;

  // Si no es admin y tiene movimientos, rechazar
  if (!isAdmin && lote.stock_actual !== lote.cantidad_inicial) {
    throw new Error(
      'No se puede eliminar el lote porque tiene movimientos de stock. Solo un administrador puede hacerlo.'
    );
  }

  const { error } = await supabaseAdmin
    .from('lotes')
    .delete()
    .eq('id_lote', id);

  if (error) throw error;

  return { success: true, message: 'Lote eliminado correctamente' };
};

// ====================================================
// SERVICE: ALERTAS DE VENCIMIENTO
// ====================================================

export const getAlertasVencimiento = async (dias) => {
  const limite = new Date();
  limite.setDate(limite.getDate() + parseInt(dias));

  const { data, error } = await supabaseAdmin
    .from('lotes')
    .select(
      `
      *,
      productos (*)
    `
    )
    .gte('fecha_vencimiento', new Date().toISOString().split('T')[0])
    .lte('fecha_vencimiento', limite.toISOString().split('T')[0])
    .eq('estado', 'disponible')
    .order('fecha_vencimiento', { ascending: true });

  if (error) throw error;

  return { lotes: data.map(calcularEstadoLote), total: data.length };
};
