import { getUserRole } from '../services/user.service.js';

export const requireSuperAdmin = async (req, res, next) => {
  try {
    const role = await getUserRole(req.user.id);

    if (role !== 'admin') {
      return res.status(403).json({ error: 'Se requieren permisos de administrador' });
    }

    next();
  } catch (err) {
    return res.status(500).json({ error: 'Error verificando permisos' });
  }
};
