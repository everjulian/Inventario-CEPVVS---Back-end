// services/categorias.service.js
import { supabaseAdmin } from '../config/supabase.js';

export const getAll = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('categorias')
      .select('*')
      .order('nombre');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error en service getAll:', error);
    throw error;
  }
};

export const create = async ({ nombre, descripcion, activo }) => {
  try {
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
    return data;
  } catch (error) {
    console.error('Error en service create:', error);
    throw error;
  }
};

export const update = async (id, { nombre, descripcion, activo }) => {
  try {
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
    return data; // Será null si no encuentra la categoría
  } catch (error) {
    console.error('Error en service update:', error);
    throw error;
  }
};

export const remove = async (id) => {
  try {
    const { error } = await supabaseAdmin
      .from('categorias')
      .delete()
      .eq('id_categoria', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error en service remove:', error);
    throw error;
  }
};

export const hasProducts = async (categoriaId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('productos')
      .select('id_producto')
      .eq('categoria_id', categoriaId)
      .limit(1);

    if (error) throw error;
    return data.length > 0;
  } catch (error) {
    console.error('Error en service hasProducts:', error);
    throw error;
  }
};