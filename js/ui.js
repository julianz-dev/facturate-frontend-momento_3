
console.log("[GCO-UI ONLINE]");

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

    // Limpiar la lista antes de actualizarla
    gco_listaCarrito.replaceChildren();

    // Controlar mensaje de carrito vacío
    gco_carritoVacio.hidden = gco_carrito.length > 0;

    // Inicializar subtotal general
    let gco_subtotalGeneral = 0;

    // Recorrer productos del carrito
    gco_carrito.forEach((gco_producto) => {

        // Obtener precio y cantidad
        const gco_precioUnitario = Number(gco_producto.precio_unitario);
        const gco_cantidad = Number(gco_producto.cantidad);

        // Calcular subtotal del producto
        const gco_subtotalProducto = gco_precioUnitario * gco_cantidad;

        // Acumular subtotal general
        gco_subtotalGeneral += gco_subtotalProducto;

        // Crear elemento del producto
        const gco_item = document.createElement("li");

        gco_item.className = "cart-item";

        // Crear encabezado del producto
        const gco_encabezado = document.createElement("div");

        gco_encabezado.className = "cart-item-header";

        // Nombre del producto
        const gco_nombre = document.createElement("strong");

        gco_nombre.className = "cart-item-name";
        gco_nombre.textContent = gco_producto.nombre_producto;

        // Subtotal del producto
        const gco_subtotal = document.createElement("strong");

        gco_subtotal.className = "cart-item-subtotal";
        gco_subtotal.textContent = gco_formatoMoneda.format(
            gco_subtotalProducto
        );

        // Información complementaria
        const gco_detalles = document.createElement("p");

        gco_detalles.className = "cart-item-details";

        gco_detalles.textContent =
            `${gco_formatoMoneda.format(gco_precioUnitario)} × ${gco_cantidad}`;

        // Incorporar elementos al encabezado
        gco_encabezado.append(
            gco_nombre,
            gco_subtotal
        );

        // Incorporar elementos al producto
        gco_item.append(
            gco_encabezado,
            gco_detalles
        );

        // Incorporar producto a la lista
        gco_listaCarrito.appendChild(gco_item);

    });

    // Mantener descuentos e impuestos en cero
    const gco_descuentoGeneral = 0;
    const gco_impuestosGeneral = 0;

    // Calcular total de la venta
    const gco_totalGeneral =
        gco_subtotalGeneral +
        gco_descuentoGeneral +
        gco_impuestosGeneral;

    // Actualizar resumen de la venta
    gco_elementoSubtotal.textContent =
        gco_formatoMoneda.format(gco_subtotalGeneral);

    gco_elementoDescuento.textContent =
        gco_formatoMoneda.format(gco_descuentoGeneral);

    gco_elementoImpuestos.textContent =
        gco_formatoMoneda.format(gco_impuestosGeneral);

    gco_elementoTotal.textContent =
        gco_formatoMoneda.format(gco_totalGeneral);

}