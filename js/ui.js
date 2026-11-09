//* ========================================
//* ESTADOS DE CARGA
//* ========================================

// Mostrar carga de clientes
export function mostrarCargaClientes() {

    const selectorCliente = document.querySelector("#selectorCliente");

    selectorCliente.replaceChildren();

    const opcion = document.createElement("option");

    opcion.value = "";
    opcion.textContent = "Cargando clientes...";
    opcion.disabled = true;
    opcion.selected = true;

    selectorCliente.appendChild(opcion);

}

// Mostrar carga de productos
export function mostrarCargaProductos() {

    const listaProductos = document.querySelector("#listaProductos");

    listaProductos.textContent = "Cargando productos...";

}

//* ========================================
//* MOSTRAR CLIENTES
//* ========================================

export function mostrarClientes(clientes) {

    const selectorCliente = document.querySelector("#selectorCliente");

    selectorCliente.replaceChildren();

    // Opción inicial
    const opcionInicial = document.createElement("option");

    opcionInicial.value = "";
    opcionInicial.textContent = "Selecciona un cliente";
    opcionInicial.disabled = true;
    opcionInicial.selected = true;

    selectorCliente.appendChild(opcionInicial);

    // Verificar disponibilidad de clientes
    if (clientes.length === 0) {

        const opcionVacia = document.createElement("option");

        opcionVacia.textContent = "No hay clientes activos disponibles";
        opcionVacia.disabled = true;

        selectorCliente.appendChild(opcionVacia);

        return;

    }

    // Recorrer clientes y crear opciones
    clientes.forEach((cliente) => {

        const opcion = document.createElement("option");

        opcion.value = cliente.cliente_id;

        const nombreCliente =
            cliente.nombre_razon_social ?? "Cliente sin nombre";

        const numeroDocumento =
            cliente.numero_documento ?? "(Cliente genérico)";

        opcion.textContent =
            `${nombreCliente} - ${numeroDocumento}`;

        selectorCliente.appendChild(opcion);

    });

}

//* ========================================
//* MOSTRAR TABLA DE CLIENTES
//* ========================================

export function mostrarTablaClientes(clientes) {
    const tablaClientes = document.querySelector("#tablaClientes");

    // Limpiar tabla antes de actualizarla
    tablaClientes.replaceChildren();

    // Verificar disponibilidad de clientes
    if (!Array.isArray(clientes) || clientes.length === 0) {
        const filaVacia = document.createElement("tr");
        const celdaVacia = document.createElement("td");

        celdaVacia.colSpan = 6;
        celdaVacia.className = "empty-table";
        celdaVacia.textContent = "No se encontraron clientes.";

        filaVacia.appendChild(celdaVacia);
        tablaClientes.appendChild(filaVacia);

        return;
    }

    // Recorrer clientes y construir las filas
    clientes.forEach((cliente) => {
        const fila = document.createElement("tr");

        // Identificador del cliente
        const idCliente =
            cliente.cliente_id ?? cliente.id ?? "—";
        const celdaId = document.createElement("td");
        celdaId.textContent = idCliente;

        // Nombre o razón social
        const celdaNombre = document.createElement("td");
        celdaNombre.textContent =
            cliente.nombre_razon_social ?? "Cliente sin nombre";

        // Documento
        const celdaDocumento = document.createElement("td");
        const documento = cliente.es_generico
            ? "No aplica"
            : [cliente.tipo_documento, cliente.numero_documento]
                .filter(Boolean)
                .join(" ") || "Sin documento";
        celdaDocumento.textContent = documento;

        // Tipo de cliente
        const celdaTipo = document.createElement("td");
        celdaTipo.textContent = cliente.es_generico
            ? "Genérico"
            : "Identificado";

        // Estado del cliente
        const celdaEstado = document.createElement("td");
        const etiquetaEstado = document.createElement("span");

        if (cliente.activo === true) {
            etiquetaEstado.className = "badge text-bg-success";
            etiquetaEstado.textContent = "Activo";
        } else if (cliente.activo === false) {
            etiquetaEstado.className = "badge text-bg-secondary";
            etiquetaEstado.textContent = "Inactivo";
        } else {
            etiquetaEstado.className = "badge text-bg-warning";
            etiquetaEstado.textContent = "Sin estado";
        }

        celdaEstado.appendChild(etiquetaEstado);

        // Acciones disponibles para el cliente
        const celdaAcciones = document.createElement("td");

        celdaAcciones.className = "text-nowrap";

        // Botón editar cliente
        const botonEditar = document.createElement("button");

        botonEditar.type = "button";
        botonEditar.className = "btn btn-sm btn-outline-primary me-1";
        botonEditar.textContent = "Editar";
        botonEditar.dataset.accion = "editar-cliente";
        botonEditar.dataset.clienteId = idCliente;

        // Botón activar o inactivar cliente
        const botonEstado = document.createElement("button");

        botonEstado.type = "button";

        botonEstado.className = cliente.activo
            ? "btn btn-sm btn-outline-danger"
            : "btn btn-sm btn-outline-success";

        botonEstado.textContent = cliente.activo
            ? "Inactivar"
            : "Activar";

        // Proteger el cliente genérico
        if (cliente.es_generico === true) {

            botonEstado.disabled = true;

            botonEstado.className =
                "btn btn-sm btn-outline-secondary";

            botonEstado.textContent = "Protegido";

            botonEstado.title =
                "El cliente genérico no se puede inactivar.";

        }

        botonEstado.dataset.accion = "cambiar-estado-cliente";
        botonEstado.dataset.clienteId = idCliente;

        // Incorporar acciones según el tipo de cliente
        if (cliente.es_generico === true) {

            // El cliente genérico solamente muestra su protección
            celdaAcciones.append(botonEstado);

        } else {

            // Los demás clientes muestran sus acciones habituales
            celdaAcciones.append(
                botonEditar,
                botonEstado
            );

        }
        // Incorporar celdas a la fila
        fila.append(
            celdaId,
            celdaNombre,
            celdaDocumento,
            celdaTipo,
            celdaEstado,
            celdaAcciones,
        );

        // Incorporar fila a la tabla
        tablaClientes.appendChild(fila);
    });
}

//* ========================================
//* ACTUALIZAR INDICADORES DE CLIENTES
//* ========================================

export function actualizarIndicadoresClientes(clientes) {
    const totalClientes = document.querySelector("#totalClientesAdmin");
    const clientesActivos = document.querySelector("#clientesActivosAdmin");
    const clientesInactivos = document.querySelector("#clientesInactivosAdmin");

    // Calcular cantidades
    const total = clientes.length;
    const activos = clientes.filter(
        (cliente) => cliente.activo === true,
    ).length;
    const inactivos = clientes.filter(
        (cliente) => cliente.activo === false,
    ).length;

    // Actualizar indicadores
    totalClientes.textContent = total;
    clientesActivos.textContent = activos;
    clientesInactivos.textContent = inactivos;
}

//* ========================================
//* MOSTRAR ERROR EN TABLA DE CLIENTES
//* ========================================

export function mostrarErrorTablaClientes() {
    const tablaClientes = document.querySelector("#tablaClientes");

    tablaClientes.replaceChildren();

    const filaError = document.createElement("tr");
    const celdaError = document.createElement("td");

    celdaError.colSpan = 6;
    celdaError.className = "empty-table";
    celdaError.textContent =
        "No fue posible cargar los clientes. Intenta nuevamente.";

    filaError.appendChild(celdaError);
    tablaClientes.appendChild(filaError);
}

//* ========================================
//* MOSTRAR PRODUCTOS
//* ========================================

export function mostrarProductos(productos) {

    const listaProductos = document.querySelector("#listaProductos");

    listaProductos.replaceChildren();

    // Verificar disponibilidad de productos
    if (productos.length === 0) {

        const mensaje = document.createElement("p");

        mensaje.className = "empty-state";
        mensaje.textContent = "No se encontraron productos.";

        listaProductos.appendChild(mensaje);

        return;

    }

    // Formatear valores monetarios
    const formatoMoneda = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    });

    // Recorrer productos y crear tarjetas
    productos.forEach((producto) => {

        const tarjeta = document.createElement("article");

        tarjeta.className = "product-item";
        tarjeta.dataset.productoId = producto.producto_id;

        // Nombre del producto
        const nombre = document.createElement("h4");

        nombre.className = "product-name";
        nombre.textContent = producto.nombre_producto;

        // Código del producto
        const codigo = document.createElement("p");

        codigo.className = "product-code";
        codigo.textContent = `Código: ${producto.codigo_producto}`;

        // Precio del producto
        const precio = document.createElement("strong");

        precio.className = "product-price";
        precio.textContent = formatoMoneda.format(
            Number(producto.precio_venta)
        );

        // Botón para agregar al carrito
        const botonAgregar = document.createElement("button");

        botonAgregar.type = "button";
        botonAgregar.className = "btn-agregar-producto";
        botonAgregar.textContent = "Agregar al carrito";

        // Identificar la acción y el producto seleccionado
        botonAgregar.dataset.accion = "agregar-carrito";
        botonAgregar.dataset.productoId = producto.producto_id;

        // Incorporar elementos a la tarjeta
        tarjeta.append(
            nombre,
            codigo,
            precio,
            botonAgregar
        );

        // Incorporar tarjeta al catálogo
        listaProductos.appendChild(tarjeta);

    });

}

// ========================================
// ACTUALIZAR INDICADORES
// ========================================

export function actualizarIndicadores(
    cantidadClientes,
    cantidadProductos
) {

    const indicadorClientes =
        document.querySelector("#indicadorClientes");

    const indicadorProductos =
        document.querySelector("#indicadorProductos");

    indicadorClientes.textContent = cantidadClientes;

    indicadorProductos.textContent = cantidadProductos;

}

//* ========================================
//* MOSTRAR ERRORES
//* ========================================

export function mostrarErrorClientes() {

    const selectorCliente = document.querySelector("#selectorCliente");

    selectorCliente.replaceChildren();

    const opcionError = document.createElement("option");

    opcionError.textContent = "Error al cargar los clientes";
    opcionError.disabled = true;

    selectorCliente.appendChild(opcionError);

}

export function mostrarErrorProductos() {

    const listaProductos = document.querySelector("#listaProductos");

    listaProductos.replaceChildren();

    const mensaje = document.createElement("p");

    mensaje.className = "empty-state";
    mensaje.textContent = "No fue posible cargar los productos. Intenta nuevamente.";

    listaProductos.appendChild(mensaje);

}

//* ========================================
//* MOSTRAR CARRITO DE VENTA
//* ========================================

export function mostrarCarrito(carrito) {

    // Seleccionar elementos del carrito
    const listaCarrito = document.querySelector("#listaCarrito");
    const carritoVacio = document.querySelector("#carritoVacio");

    // Seleccionar elementos del resumen
    const elementoSubtotal = document.querySelector("#subtotalVenta");
    const elementoDescuento = document.querySelector("#descuentoVenta");
    const elementoImpuestos = document.querySelector("#impuestosVenta");
    const elementoTotal = document.querySelector("#totalVenta");

    // Formatear valores monetarios
    const formatoMoneda = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    });

    // Limpiar lista antes de actualizarla
    listaCarrito.replaceChildren();

    // Controlar mensaje de carrito vacío
    carritoVacio.hidden = carrito.length > 0;

    // Inicializar subtotal general
    let subtotalGeneral = 0;

    // Recorrer productos del carrito
    carrito.forEach((producto) => {

        const precioUnitario = Number(producto.precio_unitario);
        const cantidad = Number(producto.cantidad);

        // Calcular subtotal del producto
        const subtotalProducto = precioUnitario * cantidad;

        subtotalGeneral += subtotalProducto;

        // Crear elemento del producto
        const item = document.createElement("li");
        item.className = "cart-item";

        // Encabezado del producto
        const encabezado = document.createElement("div");
        encabezado.className = "cart-item-header";

        // Nombre
        const nombre = document.createElement("strong");
        nombre.className = "cart-item-name";
        nombre.textContent = producto.nombre_producto;

        // Subtotal
        const subtotal = document.createElement("strong");
        subtotal.className = "cart-item-subtotal";
        subtotal.textContent = formatoMoneda.format(
            subtotalProducto
        );

        encabezado.append(nombre, subtotal);

        // Información del producto
        const detalles = document.createElement("p");
        detalles.className = "cart-item-details";

        detalles.textContent =
            `Precio unitario: ${formatoMoneda.format(precioUnitario)}`;

        // Controles de cantidad
        const controles = document.createElement("div");
        controles.className = "cart-item-controls";

        // Botón disminuir
        const botonDisminuir = document.createElement("button");
        botonDisminuir.type = "button";
        botonDisminuir.className = "btn-cantidad";
        botonDisminuir.textContent = "−";
        botonDisminuir.dataset.accion = "disminuir-cantidad";
        botonDisminuir.dataset.productoId = producto.producto_id;
        botonDisminuir.setAttribute("aria-label", "Disminuir cantidad");
        botonDisminuir.disabled = cantidad <= 1;

        // Mostrar cantidad actual
        const cantidadTexto = document.createElement("span");
        cantidadTexto.className = "cart-item-quantity";
        cantidadTexto.textContent = cantidad;

        // Botón aumentar
        const botonAumentar = document.createElement("button");
        botonAumentar.type = "button";
        botonAumentar.className = "btn-cantidad";
        botonAumentar.textContent = "+";
        botonAumentar.dataset.accion = "incrementar-cantidad";
        botonAumentar.dataset.productoId = producto.producto_id;
        botonAumentar.setAttribute("aria-label", "Aumentar cantidad");

        // Botón eliminar
        const botonEliminar = document.createElement("button");
        botonEliminar.type = "button";
        botonEliminar.className = "btn-eliminar-producto";
        botonEliminar.textContent = "Eliminar";
        botonEliminar.dataset.accion = "eliminar-producto";
        botonEliminar.dataset.productoId = producto.producto_id;

        // Incorporar controles
        controles.append(
            botonDisminuir,
            cantidadTexto,
            botonAumentar,
            botonEliminar
        );

        // Incorporar elementos al producto
        item.append(
            encabezado,
            detalles,
            controles
        );

        // Incorporar producto al carrito visual
        listaCarrito.appendChild(item);

    });

    // Mantener descuentos e impuestos en cero
    const descuentoGeneral = 0;
    const impuestosGeneral = 0;

    // Calcular total
    const totalGeneral =
        subtotalGeneral +
        descuentoGeneral +
        impuestosGeneral;

    // Actualizar resumen
    elementoSubtotal.textContent =
        formatoMoneda.format(subtotalGeneral);

    elementoDescuento.textContent =
        formatoMoneda.format(descuentoGeneral);

    elementoImpuestos.textContent =
        formatoMoneda.format(impuestosGeneral);

    elementoTotal.textContent =
        formatoMoneda.format(totalGeneral);

}