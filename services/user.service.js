// services/user.service.js
import { supabaseAdmin } from '../config/supabase.js';

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
