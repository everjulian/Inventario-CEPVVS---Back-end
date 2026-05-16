import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';

const app = express();

// 1. CORS debe ir primero para responder correctamente a las peticiones preflight (OPTIONS)
app.use(cors({
  origin: process.env.CLIENT_URL || '*',   // Ajustar en producción
}));

// 2. Parseo de JSON
app.use(express.json());

// 3. Middlewares de Seguridad Globales
// Helmet añade cabeceras HTTP de seguridad. Se relaja la política de recursos cruzados para permitir al frontend (CORS).
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); 

// Rate Limiting (Prevención de ataques de fuerza bruta y mitigación básica de DDoS)
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos (tiempo de espera más corto)
  max: 1500, // Límite de 1500 peticiones por IP por ventana (permite uso fluido de la app)
  message: { error: 'Demasiadas peticiones desde esta IP, por favor intente de nuevo después de 5 minutos.' }
});
app.use(limiter);

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
