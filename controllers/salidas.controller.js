// controllers/salidas.controller.js
import * as salidasService from '../services/salidas.service.js';

export async function getAll(req, res, next) {
  try {
    const salidas = await salidasService.getAllSalidas();
    res.json({ salidas });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const salida = await salidasService.getSalidaById(req.params.id);
    if (!salida) return res.status(404).json({ error: 'Salida no encontrada' });

    res.json({ salida });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const {
      numero_acta_salida,
      fecha_salida,
      beneficiario,
      lugar_salida,
      detalles
    } = req.body;

    if (!numero_acta_salida || !fecha_salida || !beneficiario || !detalles) {
      return res.status(400).json({
        error: 'Número de acta, fecha, beneficiario y detalles son requeridos'
      });
    }

    if (!Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({
        error: 'Debe incluir al menos un producto en los detalles'
      });
    }

    await salidasService.validarStock(detalles);

    const idUsuario = await salidasService.getUsuarioIdByAuth(req.user.id);

    const salida = await salidasService.crearSalida({
      numero_acta_salida,
      fecha_salida,
      beneficiario,
      lugar_salida,
      fecha_salida,
      id_usuario_registrador: idUsuario
    });

    const detallesConSalida = detalles.map(d => ({
      ...d,
      id_salida: salida.id_salida,
      id_usuario_registrador: idUsuario
    }));

    await salidasService.crearDetalleSalida(detallesConSalida);

    const salidaCompleta = await salidasService.getSalidaById(salida.id_salida);

    res.status(201).json({
      salida: salidaCompleta,
      message: 'Salida registrada exitosamente'
    });

  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params;

    const existe = await salidasService.existeSalida(id);
    if (!existe) return res.status(404).json({ error: 'Salida no encontrada' });

    await salidasService.eliminarSalida(id);

    res.json({
      success: true,
      message: 'Salida eliminada correctamente'
    });

  } catch (err) {
    next(err);
  }
}

export async function getSugerencia(req, res, next) {
  try {
    const sugerencia = await salidasService.obtenerSugerenciaNumeroActa();
    res.json({ sugerencia });
  } catch (err) {
    next(err);
  }
}
