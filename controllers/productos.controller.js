// controllers/productos.controller.js
import * as productosService from '../services/productos.service.js';
import { getUserRole } from '../services/user.service.js';

export const getAll = async (req, res, next) => {
  try {
    const productos = await productosService.getAll();
    res.json({ productos });
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const producto = await productosService.getById(req.params.id);
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ producto });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const userId = req.user.id; // viene del middleware authenticateToken
    const producto = await productosService.create(req.body, userId);
    res.status(201).json({ producto });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const producto = await productosService.update(req.params.id, req.body);
    res.json({ producto });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    // Obtener el rol del usuario autenticado
    const userRole = await getUserRole(req.user.id);
    const isAdmin = userRole === 'admin';
    
    const result = await productosService.remove(req.params.id, isAdmin);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getInventarioStock = async (req, res, next) => {
  try {
    const productos = await productosService.getInventarioStock();
    res.json({ productos });
  } catch (err) {
    next(err);
  }
};
