import * as lotesService from '../services/lotes.service.js';

// ----------------------------------------
// GET /api/lotes
// ----------------------------------------
export const getAll = async (req, res, next) => {
  try {
    const lotes = await lotesService.getAll();
    res.json({ lotes });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------
// GET /api/lotes/producto/:idProducto
// ----------------------------------------
export const getByProducto = async (req, res, next) => {
  try {
    const { idProducto } = req.params;
    const lotes = await lotesService.getByProducto(idProducto);
    res.json({ lotes });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------
// GET /api/lotes/:id
// ----------------------------------------
export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lote = await lotesService.getById(id);
    res.json({ lote });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------
// POST /api/lotes
// ----------------------------------------
export const create = async (req, res, next) => {
  try {
    const lote = await lotesService.create(req.body, req.user);
    res.status(201).json({ lote });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------
// PUT /api/lotes/:id
// ----------------------------------------
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lote = await lotesService.update(id, req.body);
    res.json({ lote });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------
// DELETE /api/lotes/:id
// ----------------------------------------
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await lotesService.remove(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------
// GET /api/lotes/alertas/vencimientos
// ----------------------------------------
export const getAlertasVencimiento = async (req, res, next) => {
  try {
    const dias = req.query.dias ?? 30;
    const result = await lotesService.getAlertasVencimiento(dias);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
