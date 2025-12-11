// services/admin.service.js
import { supabaseAdmin } from '../config/supabase.js';

/* Crear usuario tanto en Auth como en tabla usuarios */
export const createUserAccount = async (payload) => {
  const { email, password, username, nombre, apellido, rol } = payload;

  // Crear usuario en Auth
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError) throw new Error(authError.message);

  // Crear usuario en tu tabla
  const { data: usuarioData, error: usuarioError } =
    await supabaseAdmin.from('usuarios').insert([
      {
        username,
        email,
        password_hash: 'auth_managed',
        nombre: nombre || '',
        apellido: apellido || '',
        rol,
        activo: true,
        fecha_creacion: new Date(),
        auth_uid: authData.user.id,
      },
    ])
    .select()
    .single();

  if (usuarioError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    throw new Error(usuarioError.message);
  }

  return {
    user: usuarioData,
    auth_uid: authData.user.id
  };
};

/* Listar usuarios */
export const listUsers = async () => {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('*')
    .order('fecha_creacion', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

/* Desactivar usuario */
export const deactivateUser = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .update({ activo: false })
    .eq('id_usuario', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/* Activar usuario */
export const activateUser = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .update({ activo: true })
    .eq('id_usuario', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/* Obtener usuario actual */
export const getUserByAuthUid = async (uid) => {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('id_usuario')
    .eq('auth_uid', uid)
    .single();

  if (error) throw new Error(error.message);
  return data;
};
