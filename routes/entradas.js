import { Router } from 'express';
import { supabaseAdmin, authenticateToken } from '../config.js';

const router = Router();

// GET /api/entradas - Listar todas las entradas
router.get('/', authenticateToken, async (req, res) => {
  try {
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

    res.json({ entradas: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/entradas/:id - Obtener una entrada específica
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

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
    if (!data) return res.status(404).json({ error: 'Entrada no encontrada' });

    res.json({ entrada: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/entradas - Crear nueva entrada con productos (nuevos o existentes)
// POST /api/entradas - Crear nueva entrada con productos (nuevos o existentes)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { 
      numero_acta, 
      fecha_entrada, 
      proveedor, 
      archivo_acta,
      productos
    } = req.body;

    // Validaciones básicas
    if (!numero_acta || !fecha_entrada || !proveedor || !productos || !Array.isArray(productos)) {
      return res.status(400).json({ 
        error: 'Número de acta, fecha, proveedor y productos son requeridos' 
      });
    }

    if (productos.length === 0) {
      return res.status(400).json({ 
        error: 'Debe incluir al menos un producto' 
      });
    }

    // 🎯 VALIDAR PRODUCTOS EN EL BACKEND TAMBIÉN
    for (const producto of productos) {
      if (producto.tipo === 'existente' && !producto.id_producto) {
        return res.status(400).json({ error: 'Producto existente debe tener ID' });
      }
      if (producto.tipo === 'nuevo' && (!producto.codigo || !producto.nombre_articulo)) {
        return res.status(400).json({ error: 'Producto nuevo debe tener código y nombre' });
      }
      // 🎯 AGREGAR VALIDACIÓN DE CATEGORÍA
      if (producto.tipo === 'nuevo' && !producto.categoria_id) {
        return res.status(400).json({ error: 'Producto nuevo debe tener una categoría asignada' });
      }
      if (!producto.numero_lote || !producto.fecha_vencimiento || !producto.cantidad) {
        return res.status(400).json({ error: 'Todos los productos deben tener lote, vencimiento y cantidad' });
      }
    }

    // Obtener el id_usuario del usuario autenticado
    const { data: usuario } = await supabaseAdmin
      .from('usuarios')
      .select('id_usuario')
      .eq('auth_uid', req.user.id)
      .single();

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // 1. Crear la entrada principal
    const { data: entrada, error: entradaError } = await supabaseAdmin
      .from('entradas')
      .insert([
        {
          numero_acta,
          fecha_entrada,
          proveedor,
          archivo_acta,
          id_usuario_registrador: usuario.id_usuario
        }
      ])
      .select()
      .single();

    if (entradaError) throw entradaError;

    // 2. Procesar cada producto de la entrada
    const detallesEntrada = [];

    for (const producto of productos) {
      let idProducto = producto.id_producto;

      // 🎯 SI ES PRODUCTO NUEVO, CREARLO
      if (producto.tipo === 'nuevo') {
        // Verificar que el código no exista
        const { data: productoExistente, error: checkError } = await supabaseAdmin
          .from('productos')
          .select('id_producto')
          .eq('codigo', producto.codigo)
          .single();

        if (productoExistente) {
          // Si el producto ya existe con ese código, usar el existente
          idProducto = productoExistente.id_producto;
        } else {
          // 🎯 CREAR EL NUEVO PRODUCTO CON CATEGORÍA
          const productoData = {
            codigo: producto.codigo,
            nombre_articulo: producto.nombre_articulo,
            descripcion: producto.descripcion,
            activo: true,
            id_usuario_creador: usuario.id_usuario
          };

          // 🎯 SOLUCIÓN: AGREGAR CATEGORÍA SI EXISTE
          if (producto.categoria_id) {
            // Validar que la categoría existe
            const { data: categoriaExistente } = await supabaseAdmin
              .from('categorias')
              .select('id_categoria')
              .eq('id_categoria', producto.categoria_id)
              .single();

            if (categoriaExistente) {
              productoData.categoria_id = producto.categoria_id;
            } else {
              console.warn(`Categoría ${producto.categoria_id} no encontrada, creando producto sin categoría`);
            }
          }

          const { data: nuevoProducto, error: productoError } = await supabaseAdmin
            .from('productos')
            .insert([productoData])
            .select()
            .single();

          if (productoError) throw productoError;
          idProducto = nuevoProducto.id_producto;
        }
      }

      // 🎯 CREAR EL LOTE (para ambos casos)
      const { data: nuevoLote, error: loteError } = await supabaseAdmin
        .from('lotes')
        .insert([
          {
            id_producto: idProducto,
            numero_lote: producto.numero_lote,
            fecha_vencimiento: producto.fecha_vencimiento,
            cantidad_inicial: producto.cantidad,
            stock_actual: producto.cantidad,
            id_usuario_creador: usuario.id_usuario
          }
        ])
        .select()
        .single();

      if (loteError) throw loteError;

      // Agregar a los detalles de la entrada
      detallesEntrada.push({
        id_entrada: entrada.id_entrada,
        id_lote: nuevoLote.id_lote,
        cantidad: producto.cantidad,
        id_usuario_registrador: usuario.id_usuario
      });
    }

    // 3. Crear los detalles de la entrada
    const { data: detallesData, error: detallesError } = await supabaseAdmin
      .from('detalle_entradas')
      .insert(detallesEntrada)
      .select(`
        *,
        lotes (
          *,
          productos (*)
        )
      `);

    if (detallesError) {
      // Si fallan los detalles, eliminar todo
      await supabaseAdmin.from('entradas').delete().eq('id_entrada', entrada.id_entrada);
      throw detallesError;
    }

    // 4. Obtener la entrada completa con detalles
    const { data: entradaCompleta, error: errorCompleta } = await supabaseAdmin
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
      .eq('id_entrada', entrada.id_entrada)
      .single();

    if (errorCompleta) throw errorCompleta;

    res.status(201).json({ 
      entrada: entradaCompleta,
      message: 'Entrada registrada exitosamente'
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'El número de acta ya existe' });
    }
    res.status(500).json({ error: error.message });
  }
});
// DELETE /api/entradas/:id - Eliminar entrada (y sus detalles en cascada)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si la entrada existe
    const { data: entrada, error: entradaError } = await supabaseAdmin
      .from('entradas')
      .select('id_entrada')
      .eq('id_entrada', id)
      .single();

    if (entradaError) {
      return res.status(404).json({ error: 'Entrada no encontrada' });
    }

    // Eliminar la entrada (los detalles se eliminan en cascada por el CASCADE)
    const { error } = await supabaseAdmin
      .from('entradas')
      .delete()
      .eq('id_entrada', id);

    if (error) throw error;

    res.json({ 
      success: true, 
      message: 'Entrada eliminada correctamente' 
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/entradas/ultimo-numero - Obtener sugerencia para próximo número de acta
router.get('/ultimo-numero/sugerencia', authenticateToken, async (req, res) => {
  try {
    const añoActual = new Date().getFullYear();
    
    const { data, error } = await supabaseAdmin
      .from('entradas')
      .select('numero_acta')
      .like('numero_acta', `ACT-${añoActual}-%`)
      .order('numero_acta', { ascending: false })
      .limit(1);

    if (error) throw error;

    let siguienteNumero = 1;
    
    if (data && data.length > 0) {
      const ultimoNumero = data[0].numero_acta;
      const matches = ultimoNumero.match(/ACT-\d+-(\d+)/);
      if (matches && matches[1]) {
        siguienteNumero = parseInt(matches[1]) + 1;
      }
    }

    const sugerencia = `ACT-${añoActual}-${siguienteNumero.toString().padStart(3, '0')}`;
    
    res.json({ sugerencia });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;