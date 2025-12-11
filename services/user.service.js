// services/user.service.js
import { supabaseAdmin } from '../config/supabase.js';

// Obtener usuario completo por auth_uid
export const getUserByAuthUid = async (authUid) => {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('*')
    .eq('auth_uid', authUid)
    .single();

  if (error) {
    const err = new Error('Usuario no encontrado');
    err.status = 404;
    throw err;
  }

  return data;
};

// Obtener SOLO el rol del usuario
export const getUserRole = async (authUid) => {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('rol')
    .eq('auth_uid', authUid)
    .single();

  if (error) {
    const err = new Error('Rol no encontrado');
    err.status = 404;
    throw err;
  }

  return data.rol;
};
