import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import productosRoutes from './routes/productos.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Usar rutas
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/productos', productosRoutes);

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Backend funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Ruta TEMPORAL para obtener token (solo para pruebas)
app.post('/api/get-token', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Usar el cliente anónimo para login
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAnon = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email: email || 'superadmin@tuapp.com',
      password: password || 'SuperAdmin123!'
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      access_token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📡 Supabase URL: ${process.env.SUPABASE_URL}`);
});

export default app;