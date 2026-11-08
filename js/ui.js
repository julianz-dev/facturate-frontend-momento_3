// ========================================
// ESTADOS DE CARGA
// ========================================

// Mostrar carga de clientes
export function gco_mostrarCargaClientes() {

    const gco_selectorCliente = document.querySelector("#selectorCliente");

    gco_selectorCliente.replaceChildren();

    const gco_opcion = document.createElement("option");

    gco_opcion.value = "";
    gco_opcion.textContent = "Cargando clientes...";
    gco_opcion.disabled = true;
    gco_opcion.selected = true;

    gco_selectorCliente.appendChild(gco_opcion);

}

// Mostrar carga de productos
export function gco_mostrarCargaProductos() {

    const gco_listaProductos = document.querySelector("#listaProductos");

    gco_listaProductos.textContent = "Cargando productos...";

}

// ========================================
// MOSTRAR CLIENTES
// ========================================

export function gco_mostrarClientes(gco_clientes) {

    const gco_selectorCliente = document.querySelector("#selectorCliente");

    gco_selectorCliente.replaceChildren();

    // Opción inicial
    const gco_opcionInicial = document.createElement("option");

    gco_opcionInicial.value = "";
    gco_opcionInicial.textContent = "Selecciona un cliente";
    gco_opcionInicial.disabled = true;
    gco_opcionInicial.selected = true;

    gco_selectorCliente.appendChild(gco_opcionInicial);

    // Verificar disponibilidad de clientes
    if (gco_clientes.length === 0) {

        const gco_opcionVacia = document.createElement("option");

        gco_opcionVacia.textContent = "No hay clientes activos disponibles";
        gco_opcionVacia.disabled = true;

        gco_selectorCliente.appendChild(gco_opcionVacia);

        return;

    }

    // Recorrer clientes y crear opciones
    gco_clientes.forEach((gco_cliente) => {

        const gco_opcion = document.createElement("option");

        gco_opcion.value = gco_cliente.cliente_id;

        const gco_nombreCliente =
            gco_cliente.nombre_razon_social ?? "Cliente sin nombre";

        const gco_numeroDocumento =
            gco_cliente.numero_documento ?? "(Cliente genérico)";

        gco_opcion.textContent =
            `${gco_nombreCliente} - ${gco_numeroDocumento}`;

        gco_selectorCliente.appendChild(gco_opcion);

    });

}

// ========================================
// MOSTRAR TABLA DE CLIENTES
// ========================================

export function gco_mostrarTablaClientes(gco_clientes) {
    const gco_tablaClientes = document.querySelector("#tablaClientes");

    // Limpiar tabla antes de actualizarla
    gco_tablaClientes.replaceChildren();

    // Verificar disponibilidad de clientes
    if (!Array.isArray(gco_clientes) || gco_clientes.length === 0) {
        const gco_filaVacia = document.createElement("tr");
        const gco_celdaVacia = document.createElement("td");

        gco_celdaVacia.colSpan = 6;
        gco_celdaVacia.className = "empty-table";
        gco_celdaVacia.textContent = "No se encontraron clientes.";

        gco_filaVacia.appendChild(gco_celdaVacia);
        gco_tablaClientes.appendChild(gco_filaVacia);

        return;
    }

    // Recorrer clientes y construir las filas
    gco_clientes.forEach((gco_cliente) => {
        const gco_fila = document.createElement("tr");

        // Identificador del cliente
        const gco_idCliente =
            gco_cliente.cliente_id ?? gco_cliente.id ?? "—";
        const gco_celdaId = document.createElement("td");
        gco_celdaId.textContent = gco_idCliente;

        // Nombre o razón social
        const gco_celdaNombre = document.createElement("td");
        gco_celdaNombre.textContent =
            gco_cliente.nombre_razon_social ?? "Cliente sin nombre";

        // Documento
        const gco_celdaDocumento = document.createElement("td");
        const gco_documento = gco_cliente.es_generico
            ? "No aplica"
            : [gco_cliente.tipo_documento, gco_cliente.numero_documento]
                .filter(Boolean)
                .join(" ") || "Sin documento";
        gco_celdaDocumento.textContent = gco_documento;

        // Tipo de cliente
        const gco_celdaTipo = document.createElement("td");
        gco_celdaTipo.textContent = gco_cliente.es_generico
            ? "Genérico"
            : "Identificado";

        // Estado del cliente
        const gco_celdaEstado = document.createElement("td");
        const gco_etiquetaEstado = document.createElement("span");

        if (gco_cliente.activo === true) {
            gco_etiquetaEstado.className = "badge text-bg-success";
            gco_etiquetaEstado.textContent = "Activo";
        } else if (gco_cliente.activo === false) {
            gco_etiquetaEstado.className = "badge text-bg-secondary";
            gco_etiquetaEstado.textContent = "Inactivo";
        } else {
            gco_etiquetaEstado.className = "badge text-bg-warning";
            gco_etiquetaEstado.textContent = "Sin estado";
        }

        gco_celdaEstado.appendChild(gco_etiquetaEstado);

        // Acciones disponibles para el cliente
        const gco_celdaAcciones = document.createElement("td");

        gco_celdaAcciones.className = "text-nowrap";

        // Botón editar cliente
        const gco_botonEditar = document.createElement("button");

        gco_botonEditar.type = "button";
        gco_botonEditar.className = "btn btn-sm btn-outline-primary me-1";
        gco_botonEditar.textContent = "Editar";
        gco_botonEditar.dataset.accion = "editar-cliente";
        gco_botonEditar.dataset.clienteId = gco_idCliente;

        // Botón activar o inactivar cliente
        const gco_botonEstado = document.createElement("button");

        gco_botonEstado.type = "button";

        gco_botonEstado.className = gco_cliente.activo
            ? "btn btn-sm btn-outline-danger"
            : "btn btn-sm btn-outline-success";

        gco_botonEstado.textContent = gco_cliente.activo
            ? "Inactivar"
            : "Activar";

        // Proteger el cliente genérico
        if (gco_cliente.es_generico === true) {

            gco_botonEstado.disabled = true;

            gco_botonEstado.className =
                "btn btn-sm btn-outline-secondary";

            gco_botonEstado.textContent = "Protegido";

            gco_botonEstado.title =
                "El cliente genérico no se puede inactivar.";

        }

        gco_botonEstado.dataset.accion = "cambiar-estado-cliente";
        gco_botonEstado.dataset.clienteId = gco_idCliente;

        // Incorporar acciones según el tipo de cliente
        if (gco_cliente.es_generico === true) {

            // El cliente genérico solamente muestra su protección
            gco_celdaAcciones.append(gco_botonEstado);

        } else {

            // Los demás clientes muestran sus acciones habituales
            gco_celdaAcciones.append(
                gco_botonEditar,
                gco_botonEstado
            );

        }
        // Incorporar celdas a la fila
        gco_fila.append(
            gco_celdaId,
            gco_celdaNombre,
            gco_celdaDocumento,
            gco_celdaTipo,
            gco_celdaEstado,
            gco_celdaAcciones,
        );

        // Incorporar fila a la tabla
        gco_tablaClientes.appendChild(gco_fila);
    });
}


// ========================================
// ACTUALIZAR INDICADORES DE CLIENTES
// ========================================

export function gco_actualizarIndicadoresClientes(gco_clientes) {
    const gco_totalClientes = document.querySelector("#totalClientesAdmin");
    const gco_clientesActivos = document.querySelector("#clientesActivosAdmin");
    const gco_clientesInactivos = document.querySelector("#clientesInactivosAdmin");

    // Calcular cantidades
    const gco_total = gco_clientes.length;
    const gco_activos = gco_clientes.filter(
        (gco_cliente) => gco_cliente.activo === true,
    ).length;
    const gco_inactivos = gco_clientes.filter(
        (gco_cliente) => gco_cliente.activo === false,
    ).length;

    // Actualizar indicadores
    gco_totalClientes.textContent = gco_total;
    gco_clientesActivos.textContent = gco_activos;
    gco_clientesInactivos.textContent = gco_inactivos;
}


// ========================================
// MOSTRAR ERROR EN TABLA DE CLIENTES
// ========================================

export function gco_mostrarErrorTablaClientes() {
    const gco_tablaClientes = document.querySelector("#tablaClientes");

    gco_tablaClientes.replaceChildren();

    const gco_filaError = document.createElement("tr");
    const gco_celdaError = document.createElement("td");

    gco_celdaError.colSpan = 6;
    gco_celdaError.className = "empty-table";
    gco_celdaError.textContent =
        "No fue posible cargar los clientes. Intenta nuevamente.";

    gco_filaError.appendChild(gco_celdaError);
    gco_tablaClientes.appendChild(gco_filaError);
}


// ========================================
// MOSTRAR PRODUCTOS
// ========================================

export function gco_mostrarProductos(gco_productos) {

    const gco_listaProductos = document.querySelector("#listaProductos");

    gco_listaProductos.replaceChildren();

    // Verificar disponibilidad de productos
    if (gco_productos.length === 0) {

        const gco_mensaje = document.createElement("p");

        gco_mensaje.className = "empty-state";
        gco_mensaje.textContent = "No se encontraron productos.";

        gco_listaProductos.appendChild(gco_mensaje);

        return;

    }

    // Formatear valores monetarios
    const gco_formatoMoneda = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    });

    // Recorrer productos y crear tarjetas
    gco_productos.forEach((gco_producto) => {

        const gco_tarjeta = document.createElement("article");

        gco_tarjeta.className = "product-item";
        gco_tarjeta.dataset.productoId = gco_producto.producto_id;

        // Nombre del producto
        const gco_nombre = document.createElement("h4");

        gco_nombre.className = "product-name";
        gco_nombre.textContent = gco_producto.nombre_producto;

        // Código del producto
        const gco_codigo = document.createElement("p");

        gco_codigo.className = "product-code";
        gco_codigo.textContent = `Código: ${gco_producto.codigo_producto}`;

        // Precio del producto
        const gco_precio = document.createElement("strong");

        gco_precio.className = "product-price";
        gco_precio.textContent = gco_formatoMoneda.format(
            Number(gco_producto.precio_venta)
        );

        // Botón para agregar al carrito
        const gco_botonAgregar = document.createElement("button");

        gco_botonAgregar.type = "button";
        gco_botonAgregar.className = "btn-agregar-producto";
        gco_botonAgregar.textContent = "Agregar al carrito";

        // Identificar la acción y el producto seleccionado
        gco_botonAgregar.dataset.accion = "agregar-carrito";
        gco_botonAgregar.dataset.productoId = gco_producto.producto_id;

        // Incorporar elementos a la tarjeta
        gco_tarjeta.append(
            gco_nombre,
            gco_codigo,
            gco_precio,
            gco_botonAgregar
        );

        // Incorporar tarjeta al catálogo
        gco_listaProductos.appendChild(gco_tarjeta);

    });

}

// ========================================
// ACTUALIZAR INDICADORES
// ========================================

export function gco_actualizarIndicadores(
    gco_cantidadClientes,
    gco_cantidadProductos
) {

    const gco_indicadorClientes =
        document.querySelector("#indicadorClientes");

    const gco_indicadorProductos =
        document.querySelector("#indicadorProductos");

    gco_indicadorClientes.textContent = gco_cantidadClientes;

    gco_indicadorProductos.textContent = gco_cantidadProductos;

}


// ========================================
// MOSTRAR ERRORES
// ========================================

export function gco_mostrarErrorClientes() {

    const gco_selectorCliente = document.querySelector("#selectorCliente");

    gco_selectorCliente.replaceChildren();

    const gco_opcionError = document.createElement("option");

    gco_opcionError.textContent = "Error al cargar los clientes";
    gco_opcionError.disabled = true;

    gco_selectorCliente.appendChild(gco_opcionError);

}


export function gco_mostrarErrorProductos() {

    const gco_listaProductos = document.querySelector("#listaProductos");

    gco_listaProductos.replaceChildren();

    const gco_mensaje = document.createElement("p");

    gco_mensaje.className = "empty-state";
    gco_mensaje.textContent = "No fue posible cargar los productos. Intenta nuevamente.";

    gco_listaProductos.appendChild(gco_mensaje);

}


// ========================================
// MOSTRAR CARRITO DE VENTA
// ========================================

export function gco_mostrarCarrito(gco_carrito) {

    // Seleccionar elementos del carrito
    const gco_listaCarrito = document.querySelector("#listaCarrito");
    const gco_carritoVacio = document.querySelector("#carritoVacio");

    // Seleccionar elementos del resumen
    const gco_elementoSubtotal = document.querySelector("#subtotalVenta");
    const gco_elementoDescuento = document.querySelector("#descuentoVenta");
    const gco_elementoImpuestos = document.querySelector("#impuestosVenta");
    const gco_elementoTotal = document.querySelector("#totalVenta");

    // Formatear valores monetarios
    const gco_formatoMoneda = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    });

    // Limpiar lista antes de actualizarla
    gco_listaCarrito.replaceChildren();

    // Controlar mensaje de carrito vacío
    gco_carritoVacio.hidden = gco_carrito.length > 0;

    // Inicializar subtotal general
    let gco_subtotalGeneral = 0;

    // Recorrer productos del carrito
    gco_carrito.forEach((gco_producto) => {

        const gco_precioUnitario = Number(gco_producto.precio_unitario);
        const gco_cantidad = Number(gco_producto.cantidad);

        // Calcular subtotal del producto
        const gco_subtotalProducto = gco_precioUnitario * gco_cantidad;

        gco_subtotalGeneral += gco_subtotalProducto;

        // Crear elemento del producto
        const gco_item = document.createElement("li");
        gco_item.className = "cart-item";

        // Encabezado del producto
        const gco_encabezado = document.createElement("div");
        gco_encabezado.className = "cart-item-header";

        // Nombre
        const gco_nombre = document.createElement("strong");
        gco_nombre.className = "cart-item-name";
        gco_nombre.textContent = gco_producto.nombre_producto;

        // Subtotal
        const gco_subtotal = document.createElement("strong");
        gco_subtotal.className = "cart-item-subtotal";
        gco_subtotal.textContent = gco_formatoMoneda.format(
            gco_subtotalProducto
        );

        gco_encabezado.append(gco_nombre, gco_subtotal);

        // Información del producto
        const gco_detalles = document.createElement("p");
        gco_detalles.className = "cart-item-details";

        gco_detalles.textContent =
            `Precio unitario: ${gco_formatoMoneda.format(gco_precioUnitario)}`;

        // Controles de cantidad
        const gco_controles = document.createElement("div");
        gco_controles.className = "cart-item-controls";

        // Botón disminuir
        const gco_botonDisminuir = document.createElement("button");
        gco_botonDisminuir.type = "button";
        gco_botonDisminuir.className = "btn-cantidad";
        gco_botonDisminuir.textContent = "−";
        gco_botonDisminuir.dataset.accion = "disminuir-cantidad";
        gco_botonDisminuir.dataset.productoId = gco_producto.producto_id;
        gco_botonDisminuir.setAttribute("aria-label", "Disminuir cantidad");
        gco_botonDisminuir.disabled = gco_cantidad <= 1;

        // Mostrar cantidad actual
        const gco_cantidadTexto = document.createElement("span");
        gco_cantidadTexto.className = "cart-item-quantity";
        gco_cantidadTexto.textContent = gco_cantidad;

        // Botón aumentar
        const gco_botonAumentar = document.createElement("button");
        gco_botonAumentar.type = "button";
        gco_botonAumentar.className = "btn-cantidad";
        gco_botonAumentar.textContent = "+";
        gco_botonAumentar.dataset.accion = "incrementar-cantidad";
        gco_botonAumentar.dataset.productoId = gco_producto.producto_id;
        gco_botonAumentar.setAttribute("aria-label", "Aumentar cantidad");

        // Botón eliminar
        const gco_botonEliminar = document.createElement("button");
        gco_botonEliminar.type = "button";
        gco_botonEliminar.className = "btn-eliminar-producto";
        gco_botonEliminar.textContent = "Eliminar";
        gco_botonEliminar.dataset.accion = "eliminar-producto";
        gco_botonEliminar.dataset.productoId = gco_producto.producto_id;

        // Incorporar controles
        gco_controles.append(
            gco_botonDisminuir,
            gco_cantidadTexto,
            gco_botonAumentar,
            gco_botonEliminar
        );

        // Incorporar elementos al producto
        gco_item.append(
            gco_encabezado,
            gco_detalles,
            gco_controles
        );

        // Incorporar producto al carrito visual
        gco_listaCarrito.appendChild(gco_item);

    });

    // Mantener descuentos e impuestos en cero
    const gco_descuentoGeneral = 0;
    const gco_impuestosGeneral = 0;

    // Calcular total
    const gco_totalGeneral =
        gco_subtotalGeneral +
        gco_descuentoGeneral +
        gco_impuestosGeneral;

    // Actualizar resumen
    gco_elementoSubtotal.textContent =
        gco_formatoMoneda.format(gco_subtotalGeneral);

    gco_elementoDescuento.textContent =
        gco_formatoMoneda.format(gco_descuentoGeneral);

    gco_elementoImpuestos.textContent =
        gco_formatoMoneda.format(gco_impuestosGeneral);

    gco_elementoTotal.textContent =
        gco_formatoMoneda.format(gco_totalGeneral);

}
