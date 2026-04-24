// services/entradas.service.js
import { supabaseAdmin } from '../config/supabase.js';

/* -----------------------------------------
   UTILIDADES INTERNAS (no exportadas)
----------------------------------------- */

/** Validación completa del payload de entrada */
function validarEntradaPayload(body) {
  const { numero_acta, fecha_entrada, proveedor, productos } = body;

  if (!numero_acta || !fecha_entrada || !proveedor || !productos) {
    throw new Error('Número de acta, fecha, proveedor y productos son requeridos');
  }

  if (!Array.isArray(productos) || productos.length === 0) {
    throw new Error('Debe incluir al menos un producto');
  }

  for (const p of productos) {
    if (p.tipo === 'existente' && !p.id_producto) {
      throw new Error('Producto existente debe tener ID');
    }

    if (p.tipo === 'nuevo') {
      if (!p.codigo || !p.nombre_articulo) {
        throw new Error('Producto nuevo debe tener código y nombre');
      }

      if (!p.categoria_id) {
        throw new Error('Producto nuevo debe tener categoría');
      }
    }

    if (!p.numero_lote || !p.fecha_vencimiento || !p.cantidad) {
      throw new Error('Todos los productos deben incluir lote, vencimiento y cantidad');
    }
  }
}

/** Obtiene el id_usuario interno basado en auth_uid */
async function obtenerUsuarioInterno(auth_uid) {
  const { data: usuario, error } = await supabaseAdmin
    .from('usuarios')
    .select('id_usuario')
    .eq('auth_uid', auth_uid)
    .single();

  if (error || !usuario) {
    throw new Error('Usuario no encontrado');
  }

  return usuario.id_usuario;
}

/** Crea producto nuevo en productos */
async function crearProductoNuevo(producto, idUsuario) {
  // Validar si ya existe un producto con ese código
  const { data: existente } = await supabaseAdmin
    .from('productos')
    .select('id_producto')
    .eq('codigo', producto.codigo)
    .single();

  if (existente) {
    return existente.id_producto;
  }

  // Validar categoría existente
  const { data: categoria } = await supabaseAdmin
    .from('categorias')
    .select('id_categoria')
    .eq('id_categoria', producto.categoria_id)
    .single();

  const productoData = {
    codigo: producto.codigo,
    nombre_articulo: producto.nombre_articulo,
    descripcion: producto.descripcion || null,
    activo: true,
    id_usuario_creador: idUsuario
  };

  if (categoria) {
    productoData.categoria_id = categoria.id_categoria;
  }

  const { data: nuevo, error } = await supabaseAdmin
    .from('productos')
    .insert(productoData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return nuevo.id_producto;
}

/** Crea lote para cualquier producto */
async function crearLote(producto, idProducto, idUsuario) {
  const { data: lote, error } = await supabaseAdmin
    .from('lotes')
    .insert({
      id_producto: idProducto,
      numero_lote: producto.numero_lote,
      fecha_vencimiento: producto.fecha_vencimiento,
      cantidad_inicial: producto.cantidad,
      stock_actual: 0,
      id_usuario_creador: idUsuario
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return lote;
}

/* -----------------------------------------
   SERVICIOS EXPORTADOS
----------------------------------------- */

export const getAll = async () => {
  const { data, error } = await supabaseAdmin
    .from('entradas')
    .select(`
      *,
      usuarios:id_usuario_registrador (username, nombre, apellido),
      detalle_entradas (
        *,
        lotes (
          *,
          productos (*)
        )
      )
    `)
    .order('fecha_entrada', { ascending: false });

  if (error) throw error;
  return data;
};

export const getById = async (id) => {
  const { data, error } = await supabaseAdmin
    .from('entradas')
    .select(`
      *,
      usuarios:id_usuario_registrador (username, nombre, apellido),
      detalle_entradas (
        *,
        lotes (
          *,
          productos (*)
        )
      )
    `)
    .eq('id_entrada', id)
    .single();

  if (error) throw error;
  return data;
};

export const create = async (body, user) => {
  validarEntradaPayload(body);

  const idUsuario = await obtenerUsuarioInterno(user.id);

  const { numero_acta, fecha_entrada, proveedor, archivo_acta, productos } = body;

  // 1. Crear la entrada principal
  const { data: entrada, error: entradaError } = await supabaseAdmin
    .from('entradas')
    .insert({
      numero_acta,
      fecha_entrada,
      proveedor,
      archivo_acta,
      id_usuario_registrador: idUsuario
    })
    .select()
    .single();

  if (entradaError) {
    throw entradaError;
  }

  const detallesEntrada = [];

  // 2. Procesar cada producto
  for (const p of productos) {
    let idProducto = p.id_producto;

    if (p.tipo === 'nuevo') {
      idProducto = await crearProductoNuevo(p, idUsuario);
    }

    const lote = await crearLote(p, idProducto, idUsuario);

    detallesEntrada.push({
      id_entrada: entrada.id_entrada,
      id_lote: lote.id_lote,
      cantidad: p.cantidad,
      id_usuario_registrador: idUsuario
    });
  }

  // 3. Insertar detalle_entradas
  const { error: detallesError } = await supabaseAdmin
    .from('detalle_entradas')
    .insert(detallesEntrada);

  if (detallesError) {
    // rollback manual
    await supabaseAdmin.from('entradas').delete().eq('id_entrada', entrada.id_entrada);
    throw detallesError;
  }

  // 4. retornar entrada completa
  return await getById(entrada.id_entrada);
};

export const remove = async (id) => {
  // Verificar existencia
  const { data: entrada } = await supabaseAdmin
    .from('entradas')
    .select('id_entrada')
    .eq('id_entrada', id)
    .single();

  if (!entrada) return false;

  const { error } = await supabaseAdmin
    .from('entradas')
    .delete()
    .eq('id_entrada', id);

  if (error) throw error;

  return true;
};

export const getSugerenciaNumeroActa = async () => {
  const añoActual = new Date().getFullYear();

  const { data, error } = await supabaseAdmin
    .from('entradas')
    .select('numero_acta')
    .like('numero_acta', `ACT-${añoActual}-%`)
    .order('numero_acta', { ascending: false })
    .limit(1);

  if (error) throw error;

  let siguiente = 1;

  if (data && data.length > 0) {
    const match = data[0].numero_acta.match(/ACT-\d+-(\d+)/);
    if (match && match[1]) {
      siguiente = parseInt(match[1]) + 1;
    }
  }

  return `ACT-${añoActual}-${siguiente.toString().padStart(3, '0')}`;
};
