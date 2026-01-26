// services/productos.service.js
import { supabaseAdmin } from '../config/supabase.js';

// Obtener todo
export const getAll = async () => {
  const { data, error } = await supabaseAdmin
    .from('productos')
    .select(`
      * ,
      categorias: categoria_id (*),
      usuarios:id_usuario_creador (username, nombre, apellido)
    `)
    .order('fecha_creacion', { ascending: false });

  if (error) throw error;
  return data;
};

// Obtener por ID
export const getById = async (id) => {
  const { data, error } = await supabaseAdmin
    .from('productos')
    .select(`
      * ,
      categorias: categoria_id (*),
      usuarios:id_usuario_creador (username, nombre, apellido),
      lotes (*)
    `)
    .eq('id_producto', id)
    .single();

  if (error) throw error;
  return data;
};

// Crear
export const create = async (body, auth_uid) => {
  const { codigo, nombre_articulo, descripcion, activo = true, categoria_id } = body;

  // Validaciones
  if (!codigo || !nombre_articulo || !categoria_id) {
    throw new Error('Código, nombre y categoría son requeridos');
  }

  if (codigo.trim().length < 2) {
    throw new Error('El código debe tener al menos 2 caracteres');
  }

  if (nombre_articulo.trim().length < 3) {
    throw new Error('El nombre debe tener al menos 3 caracteres');
  }

  // Validar que la categoría exista
  const { data: categoria } = await supabaseAdmin
    .from('categorias')
    .select('id_categoria')
    .eq('id_categoria', categoria_id)
    .single();

  if (!categoria) {
    throw new Error('La categoría no existe');
  }

  // Validar que el código no exista
  const { data: existing } = await supabaseAdmin
    .from('productos')
    .select('id_producto')
    .eq('codigo', codigo.trim())
    .maybeSingle();

  if (existing) {
    throw new Error('Ya existe un producto con este código');
  }

  // Obtener id_usuario
  const { data: usuario } = await supabaseAdmin
    .from('usuarios')
    .select('id_usuario')
    .eq('auth_uid', auth_uid)
    .single();

  if (!usuario) {
    throw new Error('Usuario no encontrado');
  }

  // Insertar
  const { data, error } = await supabaseAdmin
    .from('productos')
    .insert([
      {
        codigo: codigo.trim(),
        nombre_articulo: nombre_articulo.trim(),
        descripcion: descripcion?.trim() || null,
        activo,
        categoria_id,
        id_usuario_creador: usuario.id_usuario
      }
    ])
    .select(`
      * ,
      categorias:categoria_id (*)
    `)
    .single();

  if (error) throw error;

  return data;
};

// Actualizar
export const update = async (id, body) => {
  const { codigo, nombre_articulo, descripcion, activo, categoria_id } = body;

  // Si envía categoría nueva, validarla
  if (categoria_id) {
    const { data: categoria } = await supabaseAdmin
      .from('categorias')
      .select('id_categoria')
      .eq('id_categoria', categoria_id)
      .single();

    if (!categoria) {
      throw new Error('La categoría no existe');
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
      * ,
      categorias: categoria_id (*)
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('El código del producto ya existe');
    }
    throw error;
  }

  return data;
};

// Eliminar
export const remove = async (id, isAdmin = false) => {
  // Verificar si tiene lotes asociados
  const { data: lotes, error: lotesError } = await supabaseAdmin
    .from('lotes')
    .select('id_lote')
    .eq('id_producto', id);

  if (lotesError) throw lotesError;

  // Si no es admin y tiene lotes, rechazar
  if (!isAdmin && lotes.length > 0) {
    throw new Error('No se puede eliminar el producto porque tiene lotes asociados. Solo un administrador puede hacerlo.');
  }

  const { error } = await supabaseAdmin
    .from('productos')
    .delete()
    .eq('id_producto', id);

  if (error) throw error;

  return { success: true, message: 'Producto eliminado correctamente' };
};

// Stock / inventario
export const getInventarioStock = async () => {
  const { data, error } = await supabaseAdmin
    .from('productos')
    .select(`
      id_producto,
      codigo,
      nombre_articulo,
      descripcion,
      activo,
      categoria_id,
      categorias:categoria_id (
        id_categoria,
        nombre,
        descripcion
      ),
      lotes:lotes!inner (
        id_lote,
        numero_lote,
        fecha_vencimiento,
        cantidad_inicial,
        stock_actual,
        estado,
        fecha_creacion
      )
    `)
    .eq('activo', true)
    .order('nombre_articulo');

  if (error) throw error;

  const hoy = new Date();

  const productos = data
    .map((prod) =>
      (prod.lotes || []).map((lote) => {
        const fechaV = new Date(lote.fecha_vencimiento);
        const dias = Math.ceil((fechaV - hoy) / (1000 * 60 * 60 * 24));

        let estado = 'vigente';
        if (dias < 0) estado = 'vencido';
        else if (dias <= 30) estado = 'por_vencer';

        return {
          id: prod.id_producto,
          codigo: prod.codigo,
          nombre: prod.nombre_articulo,
          categoria_id: prod.categoria_id,
          categoria: prod.categorias,
          lote: lote.numero_lote,
          fecha_vencimiento: lote.fecha_vencimiento,
          unidad_medida: 'unidades',
          stock_actual: lote.stock_actual,
          estado_vencimiento: estado,
          id_lote: lote.id_lote,
          cantidad_inicial: lote.cantidad_inicial,
          estado_lote: lote.estado
        };
      })
    )
    .flat()
    .filter((item) => item.stock_actual > 0);

  return productos;
};
