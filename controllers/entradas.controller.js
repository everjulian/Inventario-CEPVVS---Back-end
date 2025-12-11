// controllers/entradas.controller.js
import * as entradasService from '../services/entradas.service.js';

export const getAll = async (req, res, next) => {
  try {
    const entradas = await entradasService.getAll();
    res.json({ entradas });
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const entrada = await entradasService.getById(req.params.id);

    if (!entrada) {
      return res.status(404).json({ error: 'Entrada no encontrada' });
    }

    res.json({ entrada });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const entrada = await entradasService.create(req.body, req.user);

    res.status(201).json({
      entrada,
      message: 'Entrada registrada exitosamente'
    });
  } catch (err) {
    // Detectar error código duplicado (acta repetida)
    if (err?.code === '23505') {
      return res.status(400).json({ error: 'El número de acta ya existe' });
    }
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const deleted = await entradasService.remove(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Entrada no encontrada' });
    }

    res.json({
      success: true,
      message: 'Entrada eliminada correctamente'
    });
  } catch (err) {
    next(err);
  }
};

export const getSugerencia = async (req, res, next) => {
  try {
    const sugerencia = await entradasService.getSugerenciaNumeroActa();
    res.json({ sugerencia });
  } catch (err) {
    next(err);
  }
};
