import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';

const app = express();

// Middlewares globales
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL || '*',   // Ajustar en producción
}));

// Rutas
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'Backend funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Middleware global de errores
app.use((err, req, res, next) => {
  console.error('Error global:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor'
  });
});

export default app;
