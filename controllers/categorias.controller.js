import * as categoriasService from '../services/categorias.service.js';

export const getAll = async (req, res, next) => {
  try {
    const categorias = await categoriasService.getAll();
    res.json({ categorias });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const { nombre, descripcion, activo = true } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
    }

    const categoria = await categoriasService.create({ nombre, descripcion, activo });
    res.status(201).json({ categoria });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Ya existe una categoría con este nombre' });
    }
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, activo } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
    }

    const categoria = await categoriasService.update(id, { nombre, descripcion, activo });

    if (!categoria) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json({ categoria });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Ya existe una categoría con este nombre' });
    }
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const tieneProductos = await categoriasService.hasProducts(id);
    if (tieneProductos) {
      return res.status(400).json({ 
        error: 'No se puede eliminar la categoría porque tiene productos asociados' 
      });
    }

    await categoriasService.remove(id);
    res.json({ success: true, message: 'Categoría eliminada correctamente' });

  } catch (err) {
    next(err);
  }
};
