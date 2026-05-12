import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';

const app = express();

// Middlewares de Seguridad Globales
// Helmet añade cabeceras HTTP de seguridad (previene XSS, Clickjacking, etc.)
app.use(helmet()); 

// Rate Limiting (Prevención de ataques de fuerza bruta y mitigación básica de DDoS)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Límite de 100 peticiones por IP por ventana
  message: { error: 'Demasiadas peticiones desde esta IP, por favor intente de nuevo después de 15 minutos.' }
});
app.use(limiter);

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
