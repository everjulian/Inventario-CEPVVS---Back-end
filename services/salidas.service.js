// services/salidas.service.js
import { supabaseAdmin } from '../config/supabase.js';

export async function getAllSalidas() {
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
  return data;
}

export async function getSalidaById(id) {
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
  return data;
}

export async function validarStock(detalles) {
  for (const item of detalles) {
    const { data: lote, error } = await supabaseAdmin
      .from('lotes')
      .select('stock_actual, numero_lote, productos(nombre_articulo)')
      .eq('id_lote', item.id_lote)
      .single();

    if (error) throw new Error(`Lote no encontrado: ${item.id_lote}`);

    if (lote.stock_actual < item.cantidad) {
      throw new Error(
        `Stock insuficiente en lote ${lote.numero_lote}. Disponible: ${lote.stock_actual}, Solicitado: ${item.cantidad}`
      );
    }
  }
}

export async function getUsuarioIdByAuth(authUid) {
  const { data: usuario, error } = await supabaseAdmin
    .from('usuarios')
    .select('id_usuario')
    .eq('auth_uid', authUid)
    .single();

  if (error || !usuario) throw new Error('Usuario no encontrado');
  return usuario.id_usuario;
}

export async function crearSalida(salidaData) {
  const { data, error } = await supabaseAdmin
    .from('salidas')
    .insert([salidaData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function crearDetalleSalida(detalles) {
  const { data, error } = await supabaseAdmin
    .from('detalle_salidas')
    .insert(detalles)
    .select(`
      *,
      lotes (
        *,
        productos (*)
      )
    `);

  if (error) throw error;
  return data;
}

export async function eliminarSalida(id) {
  const { error } = await supabaseAdmin
    .from('salidas')
    .delete()
    .eq('id_salida', id);

  if (error) throw error;
}

export async function existeSalida(id) {
  const { data, error } = await supabaseAdmin
    .from('salidas')
    .select('id_salida')
    .eq('id_salida', id)
    .single();

  if (error) return false;
  return !!data;
}

export async function obtenerSugerenciaNumeroActa() {
  const año = new Date().getFullYear();

  const { data, error } = await supabaseAdmin
    .from('salidas')
    .select('numero_acta_salida')
    .like('numero_acta_salida', `SAL-${año}-%`)
    .order('numero_acta_salida', { ascending: false })
    .limit(1);

  if (error) throw error;

  let siguiente = 1;

  if (data && data.length > 0) {
    const match = data[0].numero_acta_salida.match(/SAL-\d+-(\d+)/);
    if (match) siguiente = parseInt(match[1]) + 1;
  }

  return `SAL-${año}-${siguiente.toString().padStart(3, '0')}`;
}
