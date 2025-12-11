// controllers/admin.controller.js
import {
  createUserAccount,
  listUsers,
  deactivateUser,
  activateUser,
  getUserByAuthUid
} from '../services/admin.service.js';

export const createUser = async (req, res, next) => {
  try {
    const payload = { 
      ...req.body,
      rol: req.body.rol || 'usuario'
    };

    const result = await createUserAccount(payload);

    res.json({
      success: true,
      user: result.user
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (_req, res, next) => {
  try {
    const users = await listUsers();
    res.json({ users });
  } catch (error) {
    next(error);
  }
};

export const deactivate = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Evitar auto-desactivación
    const actual = await getUserByAuthUid(req.user.id);
    if (actual && actual.id_usuario === parseInt(userId)) {
      return res.status(400).json({
        error: 'No puedes desactivar tu propio usuario'
      });
    }

    const user = await deactivateUser(userId);

    res.json({
      success: true,
      message: 'Usuario desactivado',
      user
    });
  } catch (error) {
    next(error);
  }
};

export const activate = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await activateUser(userId);

    res.json({
      success: true,
      message: 'Usuario activado',
      user
    });
  } catch (error) {
    next(error);
  }
};
