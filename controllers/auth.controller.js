// controllers/auth.controller.js
import { getUserByAuthUid } from '../services/user.service.js';

export const verifyUser = async (req, res, next) => {
  try {
    const usuario = await getUserByAuthUid(req.user.id);

    res.json({
      user: {
        id: usuario.id_usuario,
        auth_uid: req.user.id,
        username: usuario.username,
        email: req.user.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: usuario.rol,
        activo: usuario.activo,
        fecha_creacion: usuario.fecha_creacion
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getUserProfile = async (req, res, next) => {
  try {
    const usuario = await getUserByAuthUid(req.user.id);
    res.json({ usuario });
  } catch (err) {
    next(err);
  }
};
