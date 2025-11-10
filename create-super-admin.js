import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createSuperAdmin() {
  try {
    const email = 'superadmin@tuapp.com';
    const password = 'SuperAdmin123!';
    const username = 'superadmin';

    console.log('🔄 Creando super administrador...');

    // 1. Crear usuario en Auth de Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });

    if (authError) {
      console.error('❌ Error creando usuario auth:', authError.message);
      return;
    }

    console.log('✅ Usuario de auth creado:', authData.user.id);

    // 2. Crear usuario en TU tabla 'usuarios'
    const { data: usuarioData, error: usuarioError } = await supabaseAdmin
      .from('usuarios')
      .insert([
        {
          username: username,
          email: email,
          password_hash: 'auth_managed', // Ya no necesitas manejar passwords
          nombre: 'Super',
          apellido: 'Administrador',
          rol: 'admin',
          activo: true,
          fecha_creacion: new Date(),
          auth_uid: authData.user.id  // Conectar con Auth
        }
      ]);

    if (usuarioError) {
      console.error('❌ Error creando usuario en tabla usuarios:', usuarioError.message);
      
      // Si falla, eliminar el usuario de auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      console.log('⚠️ Usuario de auth eliminado por fallo en tabla usuarios');
      return;
    }

    console.log('🎉 Super admin creado exitosamente!');
    console.log('📧 Email:', email);
    console.log('👤 Username:', username);
    console.log('🔑 Password:', password);
    console.log('🆔 Auth ID:', authData.user.id);
    console.log('👑 Rol: admin');

  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

createSuperAdmin();