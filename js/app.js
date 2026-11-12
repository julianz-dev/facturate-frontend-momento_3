import { verificarSesion } from "./auth.js";

import {
    consultarAPI,
    crearAPI,
    actualizarAPI,
    apiClientes,
    apiProductos,
    apiVentas,
    apiDetallesVenta,
} from "./api.js";

import {
    mostrarCargaClientes,
    mostrarCargaProductos,
    mostrarProductos,
    actualizarIndicadores,
    mostrarErrorClientes,
    mostrarErrorProductos,
    mostrarCarrito,
} from "./ui.js";

//* ========================================
//* VARIABLES DEL DASHBOARD Y DE LA VENTA
//* ========================================

// Clientes activos disponibles para nuevas ventas.
let clientesActivos = [];

// Productos activos disponibles en el catálogo de ventas.
let productosActivos = [];

// Productos incorporados al carrito de la venta actual.
let carrito = [];

// Los indicadores permanecen pendientes hasta que cada API responda.
let totalClientesRegistrados = null;
let totalProductosActivos = null;

// Datos de ventas y clientes utilizados en la tabla de ventas recientes.
let ventasDashboard = [];
let clientesPorIdDashboard = new Map();
let estadoConsultaVentasDashboard = "cargando";

// Temporizador para ocultar el mensaje de producto agregado.
let temporizadorMensajeProducto = null;


//* ========================================
//* VERIFICAR AUTORIZACIÓN DE ACCESO
//* ========================================

const accesoAutorizado = verificarSesion();

if (accesoAutorizado) {

    console.log("Sesión validada. Acceso autorizado al dashboard.");

    //* ========================================
    //* CERRAR SESIÓN
    //* ========================================

    const btnCerrarSesion = document.querySelector("#btnCerrarSesion");

    if (btnCerrarSesion) {

        btnCerrarSesion.addEventListener("click", () => {

            sessionStorage.removeItem("sesionActiva");

            window.location.replace("login.html");

        });

    }

    //* ========================================
    //* ACTUALIZAR INDICADORES DEL DASHBOARD
    //* ========================================

    function refrescarIndicadoresDashboard() {

        const clientesTexto = totalClientesRegistrados === null
            ? "—"
            : totalClientesRegistrados;

        const productosTexto = totalProductosActivos === null
            ? "—"
            : totalProductosActivos;

        actualizarIndicadores(
            clientesTexto,
            productosTexto,
        );

    }

    //* ========================================
    //* MOSTRAR Y OCULTAR CATÁLOGO DE PRODUCTOS
    //* ========================================

    const btnAlternarCatalogo = document.querySelector(
        "#btnAlternarCatalogo",
    );

    const contenedorCatalogo = document.querySelector(
        "#contenedorCatalogoProductos",
    );

    if (btnAlternarCatalogo && contenedorCatalogo) {

        btnAlternarCatalogo.addEventListener("click", () => {

            const catalogoVisible = !contenedorCatalogo.hidden;

            contenedorCatalogo.hidden = catalogoVisible;

            btnAlternarCatalogo.textContent = catalogoVisible
                ? "Mostrar productos"
                : "Ocultar productos";

            btnAlternarCatalogo.setAttribute(
                "aria-expanded",
                String(!catalogoVisible),
            );

        });

    }

    //* ========================================
    //* BUSCADOR DEL CATÁLOGO DE PRODUCTOS
    //* ========================================

    const buscarProducto = document.querySelector("#buscarProducto");

    // Aplicar el filtro actual sobre la colección de productos activos.
    // Esta función también se utiliza cuando se actualiza el catálogo desde la API.
    function aplicarFiltroProductos() {

        const terminoBusqueda = buscarProducto?.value
            .trim()
            .toLowerCase() ?? "";

        const productosFiltrados = productosActivos.filter(
            (producto) => {

                const nombreProducto = String(
                    producto.nombre_producto ?? "",
                ).toLowerCase();

                const codigoProducto = String(
                    producto.codigo_producto ?? "",
                ).toLowerCase();

                return (
                    nombreProducto.includes(terminoBusqueda) ||
                    codigoProducto.includes(terminoBusqueda)
                );

            },
        );

        mostrarProductos(productosFiltrados);

    }

    if (buscarProducto) {

        buscarProducto.addEventListener("input", aplicarFiltroProductos);

    }

    //* ========================================
    //* AGREGAR PRODUCTOS AL CARRITO
    //* ========================================

    const listaProductos = document.querySelector("#listaProductos");

    const mensajeProductoAgregado = document.querySelector(
        "#mensajeProductoAgregado",
    );


    // Mostrar mensaje de confirmación al agregar un producto.
    function mostrarMensajeProductoAgregado() {

        if (!mensajeProductoAgregado) {
            return;
        }

        mensajeProductoAgregado.textContent = "Producto agregado.";
        mensajeProductoAgregado.hidden = false;

        if (temporizadorMensajeProducto !== null) {
            clearTimeout(temporizadorMensajeProducto);
        }

        temporizadorMensajeProducto = setTimeout(() => {

            mensajeProductoAgregado.hidden = true;
            mensajeProductoAgregado.textContent = "";

            temporizadorMensajeProducto = null;

        }, 2500);

    }

    // Escuchar los eventos de los botones del catálogo.
    if (listaProductos) {

        listaProductos.addEventListener("click", (evento) => {

            const botonAgregar = evento.target.closest(
                '[data-accion="agregar-carrito"]',
            );

            if (
                !botonAgregar ||
                !listaProductos.contains(botonAgregar)
            ) {
                return;
            }

            const productoId = botonAgregar.dataset.productoId;

            // Buscar el producto seleccionado en los productos activos.
            const productoSeleccionado = productosActivos.find(
                (producto) =>
                    String(producto.producto_id) === String(productoId),
            );

            if (!productoSeleccionado) {

                console.error("No se encontró el producto seleccionado.");

                return;

            }

            // Verificar si el producto ya existe en el carrito.
            const productoExistente = carrito.find(
                (producto) =>
                    String(producto.producto_id) === String(productoId),
            );

            if (productoExistente) {

                // Si existe, aumentar su cantidad.
                productoExistente.cantidad++;

            } else {

                // Si no existe, agregarlo al carrito.
                carrito.push({

                    producto_id: productoSeleccionado.producto_id,
                    nombre_producto: productoSeleccionado.nombre_producto,
                    codigo_producto: productoSeleccionado.codigo_producto,
                    precio_unitario: Number(productoSeleccionado.precio_venta),
                    cantidad: 1,

                });

            }

            console.log("Carrito actualizado:");
            console.table(carrito);

            mostrarCarrito(carrito);
            actualizarEstadoRecaudo(true);

            mostrarMensajeProductoAgregado();

        });

    }

    //* ========================================
    //* ADMINISTRAR PRODUCTOS DEL CARRITO
    //* ========================================

    const listaCarrito = document.querySelector("#listaCarrito");

    if (listaCarrito) {

        listaCarrito.addEventListener("click", (evento) => {

            const botonControl = evento.target.closest("[data-accion]");

            if (
                !botonControl ||
                !listaCarrito.contains(botonControl)
            ) {
                return;
            }

            const productoId = botonControl.dataset.productoId;
            const accion = botonControl.dataset.accion;

            // Buscar el producto dentro del carrito.
            const productoExistente = carrito.find(
                (producto) =>
                    String(producto.producto_id) === String(productoId),
            );

            if (!productoExistente) {
                return;
            }


            // AUMENTAR CANTIDAD
            if (accion === "incrementar-cantidad") {

                productoExistente.cantidad++;


            // DISMINUIR CANTIDAD
            } else if (accion === "disminuir-cantidad") {

                if (productoExistente.cantidad > 1) {

                    productoExistente.cantidad--;

                }

            // ELIMINAR PRODUCTO
            } else if (accion === "eliminar-producto") {

                const indiceProducto = carrito.findIndex(
                    (producto) =>
                        String(producto.producto_id) === String(productoId),
                );

                if (indiceProducto !== -1) {

                    carrito.splice(indiceProducto, 1);

                }

            } else {

                return;

            }

            // Actualizar la representación del carrito y validar el recaudo.
            mostrarCarrito(carrito);
            actualizarEstadoRecaudo(true);

            console.log("Carrito actualizado:");
            console.table(carrito);

        });

    }


    //* ========================================
    //* INICIALIZAR REPRESENTACIÓN DEL CARRITO
    //* ========================================

    mostrarCarrito(carrito);

    //* ========================================
    //* VALIDAR EL RECAUDO DE LA VENTA
    //* ========================================

    // Se conserva un campo oculto con el ID del cliente seleccionado para que
    // el resto del flujo de venta siga utilizando el mismo identificador.
    const selectorClienteVenta = document.querySelector("#selectorCliente");
    const campoBusquedaCliente = document.querySelector("#busquedaCliente");
    const botonAlternarListaClientes = document.querySelector(
        "#btnAlternarListaClientes",
    );
    const listaClientesVenta = document.querySelector("#listaClientesVenta");
    const textoClienteSeleccionado = document.querySelector(
        "#clienteSeleccionadoTexto",
    );
    const selectorMetodoPago = document.querySelector("#selectorMetodoPago");
    const campoValorRecibido = document.querySelector("#valorRecibido");
    const elementoValorCambio = document.querySelector("#valorCambio");
    const mensajePago = document.querySelector("#mensajePago");
    const botonFinalizarVenta = document.querySelector("#btnFinalizarVenta");
    const notaEstadoVenta = document.querySelector("#notaEstadoVenta");

    const metodosPagoPermitidos = new Set([
        "EFECTIVO",
        "TARJETA",
        "TRANSFERENCIA",
        "QR",
        "OTRO",
    ]);

    // Identificadores temporales del entorno de prueba.
    // Sustituirlos cuando la autenticación y el origen de la venta estén definidos.
    const CONFIGURACION_PRUEBA_VENTA = Object.freeze({
        negocioId: 1,
        usuarioId: 1,
        origenId: 1,
    });

    let mostrarMensajesRecaudo = false;
    let registroVentaEnCurso = false;
    let ventaPendienteVerificacion = false;

    function calcularResumenCarrito() {

        if (carrito.length === 0) {
            return {
                valido: false,
                mensaje: "Agrega al menos un producto al carrito.",
                subtotal: 0,
                total: 0,
            };
        }

        let subtotal = 0;

        for (const producto of carrito) {

            const cantidad = Number(producto.cantidad);
            const precio = Number(producto.precio_unitario);
            const precioVacio = producto.precio_unitario === null ||
                producto.precio_unitario === undefined ||
                String(producto.precio_unitario).trim() === "";

            if (!producto.producto_id) {
                return {
                    valido: false,
                    mensaje: "Hay un producto sin identificador válido.",
                    subtotal: 0,
                    total: 0,
                };
            }

            if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
                return {
                    valido: false,
                    mensaje: "Revisa la cantidad de los productos del carrito.",
                    subtotal: 0,
                    total: 0,
                };
            }

            if (precioVacio || !Number.isFinite(precio) || precio < 0) {
                return {
                    valido: false,
                    mensaje: "Hay un producto con un precio inválido.",
                    subtotal: 0,
                    total: 0,
                };
            }

            const subtotalProducto = precio * cantidad;

            if (!Number.isFinite(subtotalProducto)) {
                return {
                    valido: false,
                    mensaje: "No fue posible calcular el subtotal de un producto.",
                    subtotal: 0,
                    total: 0,
                };
            }

            subtotal += subtotalProducto;

        }

        // En la interfaz actual no hay reglas ni controles para descuentos o
        // impuestos; por eso ambos permanecen en cero hasta definirlos.
        return {
            valido: true,
            mensaje: "",
            subtotal,
            total: subtotal,
        };

    }

    function normalizarTextoCliente(valor) {

        return String(valor ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLocaleLowerCase("es-CO")
            .trim();

    }

    function normalizarDocumentoCliente(valor) {

        return normalizarTextoCliente(valor).replace(/[^a-z0-9]/g, "");

    }

    function esClienteEmpresa(cliente) {

        return String(cliente.tipo_documento ?? "")
            .trim()
            .toUpperCase() === "NIT";

    }

    function obtenerNombreVisibleCliente(cliente) {

        return cliente.nombre_razon_social ?? "Cliente sin nombre";

    }

    function obtenerDocumentoVisibleCliente(cliente) {

        if (cliente.es_generico === true) {
            return "Cliente genérico";
        }

        const tipoDocumento = String(cliente.tipo_documento ?? "Documento").trim();
        const numeroDocumento = String(cliente.numero_documento ?? "Sin número").trim();

        return `${tipoDocumento}: ${numeroDocumento}`;

    }

    function obtenerClientesFiltrados(termino) {

        const texto = normalizarTextoCliente(termino);

        if (!texto) {
            return clientesActivos;
        }

        const documentoBuscado = normalizarDocumentoCliente(termino);

        return clientesActivos.filter((cliente) => {

            // Las empresas (NIT) se localizan por nombre o razón social.
            if (esClienteEmpresa(cliente)) {
                return normalizarTextoCliente(
                    obtenerNombreVisibleCliente(cliente),
                ).includes(texto);
            }

            // El cliente genérico no tiene documento; se puede localizar por su nombre.
            if (cliente.es_generico === true) {
                return normalizarTextoCliente(
                    obtenerNombreVisibleCliente(cliente),
                ).includes(texto);
            }

            // Las personas se localizan por número de documento (CC/CE),
            // ignorando puntos, espacios y guiones.
            return documentoBuscado !== "" && normalizarDocumentoCliente(
                cliente.numero_documento,
            ).includes(documentoBuscado);

        });

    }

    function actualizarBotonListaClientes() {

        if (!botonAlternarListaClientes || !listaClientesVenta) {
            return;
        }

        const listaVisible = !listaClientesVenta.hidden;

        botonAlternarListaClientes.textContent = listaVisible
            ? "Ocultar lista"
            : "Mostrar lista";
        botonAlternarListaClientes.setAttribute(
            "aria-expanded",
            String(listaVisible),
        );

    }

    function mostrarMensajeListaClientes(mensaje) {

        if (!listaClientesVenta) {
            return;
        }

        listaClientesVenta.replaceChildren();

        const elemento = document.createElement("p");
        elemento.className = "client-list-message";
        elemento.textContent = mensaje;

        listaClientesVenta.appendChild(elemento);

    }

    function actualizarTextoClienteSeleccionado() {

        if (!textoClienteSeleccionado) {
            return;
        }

        const cliente = obtenerClienteVentaSeleccionado();

        textoClienteSeleccionado.textContent = cliente
            ? `Cliente seleccionado: ${obtenerNombreVisibleCliente(cliente)} — ${obtenerDocumentoVisibleCliente(cliente)}`
            : "No hay un cliente seleccionado.";

    }

    function seleccionarClienteVenta(cliente) {

        const clienteId = cliente.cliente_id ?? cliente.id;

        if (clienteId === null || clienteId === undefined || String(clienteId).trim() === "") {
            return;
        }

        selectorClienteVenta.value = String(clienteId);

        if (campoBusquedaCliente) {
            campoBusquedaCliente.value = "";
        }

        if (listaClientesVenta) {
            listaClientesVenta.hidden = true;
        }

        actualizarBotonListaClientes();
        actualizarTextoClienteSeleccionado();
        actualizarEstadoRecaudo(true);

    }

    function renderizarListaClientesVenta() {

        if (!listaClientesVenta) {
            return;
        }

        const termino = campoBusquedaCliente?.value ?? "";
        const clientesFiltrados = obtenerClientesFiltrados(termino);

        listaClientesVenta.replaceChildren();

        if (clientesFiltrados.length === 0) {
            mostrarMensajeListaClientes(
                termino.trim()
                    ? "No se encontraron clientes con ese criterio."
                    : "No hay clientes activos disponibles.",
            );
            return;
        }

        const clienteSeleccionadoId = selectorClienteVenta?.value ?? "";

        clientesFiltrados.forEach((cliente) => {

            const clienteId = cliente.cliente_id ?? cliente.id;
            const boton = document.createElement("button");
            const nombre = document.createElement("span");
            const documento = document.createElement("span");

            boton.type = "button";
            boton.className = "client-option";
            boton.setAttribute(
                "aria-pressed",
                String(String(clienteId) === String(clienteSeleccionadoId)),
            );

            nombre.className = "client-option-name";
            nombre.textContent = obtenerNombreVisibleCliente(cliente);

            documento.className = "client-option-document";
            documento.textContent = obtenerDocumentoVisibleCliente(cliente);

            boton.append(nombre, documento);
            boton.addEventListener("click", () => {
                seleccionarClienteVenta(cliente);
            });

            listaClientesVenta.appendChild(boton);

        });

    }

    function obtenerClienteVentaSeleccionado() {

        const clienteId = selectorClienteVenta?.value ?? "";

        if (!clienteId) {
            return null;
        }

        return clientesActivos.find((cliente) =>
            String(cliente.cliente_id ?? cliente.id) === String(clienteId),
        ) ?? null;

    }

    campoBusquedaCliente?.addEventListener("input", () => {

        // Al iniciar una nueva búsqueda se elimina la selección anterior para
        // evitar que se facture accidentalmente a un cliente distinto del buscado.
        if (selectorClienteVenta) {
            selectorClienteVenta.value = "";
        }

        if (listaClientesVenta) {
            listaClientesVenta.hidden = false;
        }

        actualizarBotonListaClientes();
        actualizarTextoClienteSeleccionado();
        renderizarListaClientesVenta();
        actualizarEstadoRecaudo(false);

    });

    botonAlternarListaClientes?.addEventListener("click", () => {

        if (!listaClientesVenta) {
            return;
        }

        listaClientesVenta.hidden = !listaClientesVenta.hidden;
        actualizarBotonListaClientes();

        if (!listaClientesVenta.hidden) {
            renderizarListaClientesVenta();
        }

    });

    function mostrarMensajeEstadoRecaudo(mensaje, tipo = "error") {

        if (!mensajePago) {
            return;
        }

        mensajePago.textContent = mensaje;
        mensajePago.hidden = !mensaje;
        mensajePago.classList.toggle("payment-error", tipo === "error");
        mensajePago.classList.toggle("payment-pending", tipo === "pendiente");
        mensajePago.classList.toggle("payment-success", tipo === "exito");

    }

    function formatearValorPago(valor) {
        return new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0,
        }).format(valor);
    }

    function actualizarEstadoRecaudo(mostrarMensaje = false) {

        if (mostrarMensaje) {
            mostrarMensajesRecaudo = true;
        }

        if (!selectorMetodoPago || !campoValorRecibido || !elementoValorCambio) {
            return false;
        }

        const resumen = calcularResumenCarrito();
        const metodoPago = selectorMetodoPago.value;
        let valorRecibido = null;
        let cambio = 0;
        let mensajeError = "";

        if (metodoPago === "EFECTIVO") {
            campoValorRecibido.disabled = false;
            campoValorRecibido.required = true;
        } else {
            campoValorRecibido.disabled = true;
            campoValorRecibido.required = false;

            if (metodosPagoPermitidos.has(metodoPago)) {
                campoValorRecibido.value = resumen.valido
                    ? String(resumen.total)
                    : "";
            } else {
                campoValorRecibido.value = "";
            }
        }

        elementoValorCambio.textContent = formatearValorPago(0);

        if (!resumen.valido) {
            mensajeError = resumen.mensaje;
        } else if (!obtenerClienteVentaSeleccionado()) {
            mensajeError = "Selecciona un cliente activo antes de continuar.";
        } else if (!metodosPagoPermitidos.has(metodoPago)) {
            mensajeError = "Selecciona un método de pago válido.";
        } else if (metodoPago === "EFECTIVO") {

            const valorTexto = campoValorRecibido.value.trim();
            valorRecibido = Number(valorTexto);

            if (valorTexto === "" || !Number.isFinite(valorRecibido) || valorRecibido < 0) {
                mensajeError = "Ingresa un valor recibido válido.";
            } else if (valorRecibido < resumen.total) {
                mensajeError = `El valor recibido debe ser igual o superior a ${formatearValorPago(resumen.total)}.`;
            } else {
                cambio = valorRecibido - resumen.total;
            }

        } else {
            valorRecibido = resumen.total;
        }

        if (!mensajeError) {
            elementoValorCambio.textContent = formatearValorPago(cambio);
        }

        const pagoValido = !mensajeError;

        if (botonFinalizarVenta) {
            botonFinalizarVenta.disabled =
                !pagoValido || registroVentaEnCurso || ventaPendienteVerificacion;
            botonFinalizarVenta.textContent = registroVentaEnCurso
                ? "Registrando..."
                : "Finalizar venta";
        }

        if (notaEstadoVenta) {
            if (ventaPendienteVerificacion) {
                notaEstadoVenta.textContent =
                    "Hay una venta pendiente de verificación. Revisa el historial antes de registrar otra.";
            } else if (registroVentaEnCurso) {
                notaEstadoVenta.textContent = "Registrando la venta en MockAPI...";
            } else {
                notaEstadoVenta.textContent = mensajeError
                    ? "Completa los datos de la venta para validar el pago."
                    : "Pago validado. Puedes finalizar la venta.";
            }
        }

        if (mostrarMensajesRecaudo) {
            if (mensajeError) {
                mostrarMensajeEstadoRecaudo(mensajeError, "error");
            } else if (ventaPendienteVerificacion) {
                mostrarMensajeEstadoRecaudo(
                    "No registres nuevamente esta venta hasta comprobar su estado en MockAPI.",
                    "error",
                );
            } else if (registroVentaEnCurso) {
                mostrarMensajeEstadoRecaudo("Guardando la venta y sus productos...", "pendiente");
            } else {
                mostrarMensajeEstadoRecaudo("Pago válido.", "pendiente");
            }
        } else {
            mostrarMensajeEstadoRecaudo("", "error");
        }

        return pagoValido;

    }

    selectorMetodoPago?.addEventListener("change", () => {
        actualizarEstadoRecaudo(true);
    });

    campoValorRecibido?.addEventListener("input", () => {
        actualizarEstadoRecaudo(true);
    });

    //* ========================================
    //* PERSISTIR CABECERA Y DETALLES DE VENTA
    //* ========================================

    function obtenerSiguienteVentaId(ventas) {

        const idsExistentes = ventas
            .map((venta) => venta.venta_id)
            .filter((id) => id !== null && id !== undefined && String(id).trim() !== "")
            .map((id) => Number(id))
            .filter((id) => Number.isSafeInteger(id) && id >= 0);

        const siguienteId = idsExistentes.length > 0
            ? Math.max(...idsExistentes) + 1
            : 1;

        const primerId = ventas.find(
            (venta) => venta.venta_id !== null && venta.venta_id !== undefined,
        )?.venta_id;

        // Mantener el tipo de dato que utiliza venta_id en los registros existentes.
        return typeof primerId === "string"
            ? String(siguienteId)
            : siguienteId;

    }

    function generarUuidLocal() {

        if (globalThis.crypto?.randomUUID) {
            return globalThis.crypto.randomUUID();
        }

        return `venta-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    }

    function obtenerUrlRegistroVenta(ventaCreada) {

        // MockAPI actualiza cada recurso mediante su identificador interno `id`.
        // `venta_id` es el identificador funcional de Facturate y no debe usarse
        // como sustituto en la ruta del endpoint.
        const idRecurso = ventaCreada?.id;

        if (
            idRecurso === null ||
            idRecurso === undefined ||
            String(idRecurso).trim() === ""
        ) {
            throw new Error(
                "MockAPI no proporcionó el identificador interno de la venta. No es seguro intentar actualizarla usando venta_id.",
            );
        }

        return `${apiVentas}/${encodeURIComponent(String(idRecurso))}`;

    }

    async function marcarVentaAnulada(ventaCreada, ventaPayload) {

        const urlVenta = obtenerUrlRegistroVenta(ventaCreada);

        await actualizarAPI(urlVenta, {
            ...ventaPayload,
            ...ventaCreada,
            estado_venta: "ANULADA",
        });

    }

    async function buscarVentaPorUuid(uuidLocal) {

        const ventasActualizadas = await consultarAPI(apiVentas);

        return ventasActualizadas.find(
            (venta) => String(venta.uuid_local ?? "") === String(uuidLocal),
        ) ?? null;

    }

    async function recuperarVentaConIdRecurso(ventaCreada, uuidLocal) {

        // Algunas respuestas del POST pueden no incluir el objeto completo.
        // En ese caso se recupera la venta por uuid_local para obtener el `id`
        // que MockAPI utiliza realmente en las rutas PUT.
        if (
            ventaCreada?.id !== null &&
            ventaCreada?.id !== undefined &&
            String(ventaCreada.id).trim() !== ""
        ) {
            return ventaCreada;
        }

        const ventaRecuperada = await buscarVentaPorUuid(uuidLocal);

        if (!ventaRecuperada) {
            throw new Error(
                "No se encontró la cabecera recién creada al consultar por uuid_local.",
            );
        }

        // Valida que la consulta haya devuelto el identificador interno antes
        // de permitir cualquier PUT o intento de anulación.
        obtenerUrlRegistroVenta(ventaRecuperada);

        return ventaRecuperada;

    }

    function limpiarFormularioVenta() {

        carrito = [];
        mostrarCarrito(carrito);

        if (selectorClienteVenta) {
            selectorClienteVenta.value = "";
        }

        if (campoBusquedaCliente) {
            campoBusquedaCliente.value = "";
        }

        if (listaClientesVenta) {
            listaClientesVenta.hidden = true;
        }

        actualizarBotonListaClientes();
        actualizarTextoClienteSeleccionado();

        if (selectorMetodoPago) {
            selectorMetodoPago.value = "";
        }

        if (campoValorRecibido) {
            campoValorRecibido.value = "";
        }

        elementoValorCambio.textContent = formatearValorPago(0);
        actualizarEstadoRecaudo(false);

    }

    async function finalizarVenta() {

        if (registroVentaEnCurso || ventaPendienteVerificacion) {
            return;
        }

        const pagoValido = actualizarEstadoRecaudo(true);

        if (!pagoValido) {
            return;
        }

        const clienteSeleccionado = obtenerClienteVentaSeleccionado();
        const resumen = calcularResumenCarrito();
        const metodoPago = selectorMetodoPago.value;
        const valorRecibido = metodoPago === "EFECTIVO"
            ? Number(campoValorRecibido.value)
            : resumen.total;
        const cambio = valorRecibido - resumen.total;

        if (!clienteSeleccionado || !resumen.valido) {
            actualizarEstadoRecaudo(true);
            return;
        }

        registroVentaEnCurso = true;
        actualizarEstadoRecaudo(true);

        let ventaCreada = null;
        let ventaPayload = null;
        let ventaId = null;
        let detallesCreados = 0;

        try {

            // Consultar el listado más reciente para generar el siguiente venta_id
            // dentro de este entorno de prueba.
            const ventasActualizadas = await consultarAPI(apiVentas);
            const clienteId = clienteSeleccionado.cliente_id ?? clienteSeleccionado.id;

            ventaPayload = {
                venta_id: obtenerSiguienteVentaId(ventasActualizadas),
                uuid_local: generarUuidLocal(),
                negocio_id: CONFIGURACION_PRUEBA_VENTA.negocioId,
                cliente_id: String(clienteId),
                usuario_id: CONFIGURACION_PRUEBA_VENTA.usuarioId,
                fecha_venta: new Date().toISOString(),
                estado_venta: "BORRADOR",
                subtotal: resumen.subtotal,
                descuento_total: 0,
                impuesto_total: 0,
                total_venta: resumen.total,
                origen_id: CONFIGURACION_PRUEBA_VENTA.origenId,
                metodo_pago: metodoPago,
                valor_recibido: valorRecibido,
                cambio,
            };

            try {
                ventaCreada = await crearAPI(apiVentas, ventaPayload);
            } catch (errorCreacion) {
                // Si la respuesta del POST se pierde, consultar por uuid_local
                // evita crear una segunda cabecera a ciegas.
                try {
                    ventaCreada = await buscarVentaPorUuid(ventaPayload.uuid_local);
                } catch (errorVerificacion) {
                    ventaPendienteVerificacion = true;
                    throw new Error(
                        "No se pudo confirmar si MockAPI recibió la cabecera. Revisa MockAPI antes de intentar otra vez.",
                        { cause: errorCreacion },
                    );
                }

                if (!ventaCreada) {
                    // El POST pudo haberse guardado aunque la consulta inmediata
                    // todavía no lo refleje; bloquear el reintento evita duplicados.
                    ventaPendienteVerificacion = true;
                    throw new Error(
                        "No se pudo confirmar si MockAPI recibió la cabecera. Revisa el registro por uuid_local antes de intentar otra vez.",
                        { cause: errorCreacion },
                    );
                }
            }

            try {
                ventaCreada = await recuperarVentaConIdRecurso(
                    ventaCreada,
                    ventaPayload.uuid_local,
                );
            } catch (errorIdentificador) {
                ventaPendienteVerificacion = true;
                throw new Error(
                    "La cabecera fue creada, pero no se pudo recuperar el identificador interno de MockAPI. Revisa el registro antes de repetir la operación.",
                    { cause: errorIdentificador },
                );
            }

            ventaId = ventaCreada.venta_id ?? ventaPayload.venta_id;
            const ventaIdDetalle = ventaCreada.venta_id ?? ventaPayload.venta_id;

            // Crear los detalles uno a uno para conocer exactamente cuántos
            // quedaron guardados si alguna petición falla.
            for (const producto of carrito) {

                const cantidad = Number(producto.cantidad);
                const precioUnitario = Number(producto.precio_unitario);

                const detallePayload = {
                    venta_id: ventaIdDetalle,
                    producto_id: String(producto.producto_id),
                    cantidad,
                    precio_unitario: precioUnitario,
                    descripcion_producto: String(
                        producto.nombre_producto ?? "Producto sin descripción",
                    ),
                    subtotal: precioUnitario * cantidad,
                };

                await crearAPI(apiDetallesVenta, detallePayload);
                detallesCreados++;

            }

            // La cabecera se confirma únicamente cuando todos sus detalles
            // fueron creados correctamente.
            try {
                await actualizarAPI(
                    obtenerUrlRegistroVenta(ventaCreada),
                    {
                        ...ventaPayload,
                        ...ventaCreada,
                        estado_venta: "CONFIRMADA",
                    },
                );
            } catch (errorConfirmacion) {
                // La petición podría haberse aplicado aunque la respuesta se
                // haya perdido. Se consulta antes de permitir otro intento.
                try {
                    const ventaVerificada = await buscarVentaPorUuid(ventaPayload.uuid_local);

                    if (ventaVerificada?.estado_venta === "CONFIRMADA") {
                        ventaCreada = ventaVerificada;
                    } else {
                        ventaPendienteVerificacion = true;
                        throw new Error(
                            `Los detalles de la venta #${ventaId} se guardaron, pero no se pudo confirmar su estado. Revisa MockAPI antes de repetir la operación.`,
                            { cause: errorConfirmacion },
                        );
                    }
                } catch (errorVerificacion) {
                    ventaPendienteVerificacion = true;
                    if (errorVerificacion.message.includes("Los detalles de la venta")) {
                        throw errorVerificacion;
                    }
                    throw new Error(
                        `No se pudo verificar la confirmación de la venta #${ventaId}. No repitas la operación hasta revisar MockAPI.`,
                        { cause: errorConfirmacion },
                    );
                }
            }

            limpiarFormularioVenta();
            await cargarVentasDashboard();

            mostrarMensajeEstadoRecaudo(
                `Venta #${ventaId} registrada correctamente con ${detallesCreados} detalle(s).`,
                "exito",
            );

            if (notaEstadoVenta) {
                notaEstadoVenta.textContent = `La venta #${ventaId} quedó confirmada.`;
            }

            console.log(`Venta #${ventaId} registrada correctamente.`);

        } catch (error) {

            console.error("No se pudo completar el registro de la venta:", error);

            if (ventaCreada && detallesCreados < carrito.length && !ventaPendienteVerificacion) {
                try {
                    await marcarVentaAnulada(ventaCreada, ventaPayload);
                    mostrarMensajeEstadoRecaudo(
                        `No se pudieron guardar todos los productos. La venta #${ventaId} fue marcada como ANULADA. Se guardaron ${detallesCreados} de ${carrito.length} detalles.`,
                        "error",
                    );
                    await cargarVentasDashboard();
                } catch (errorAnulacion) {
                    ventaPendienteVerificacion = true;
                    console.error("No se pudo marcar la venta parcial como anulada:", errorAnulacion);
                    mostrarMensajeEstadoRecaudo(
                        `Falló el registro de detalles y no se pudo marcar la venta #${ventaId} como ANULADA. Revisa su estado en MockAPI antes de continuar.`,
                        "error",
                    );
                }
            } else {
                // Refrescar la tabla y los indicadores incluso si la confirmación
                // falla; la venta seguirá excluida de los totales mientras sea BORRADOR.
                if (ventaCreada && detallesCreados === carrito.length) {
                    await cargarVentasDashboard();
                }

                mostrarMensajeEstadoRecaudo(error.message || "Ocurrió un error al registrar la venta.", "error");
            }

            if (notaEstadoVenta) {
                notaEstadoVenta.textContent = ventaPendienteVerificacion
                    ? "La operación requiere revisión en MockAPI antes de registrar otra venta."
                    : "No se completó la venta. Revisa el mensaje y el estado registrado.";
            }

        } finally {

            // Recalcular el estado del botón sin perder el último mensaje del
            // resultado de la operación (éxito, error o revisión pendiente).
            const mensajeFinal = mensajePago?.textContent ?? "";
            const notaFinal = notaEstadoVenta?.textContent ?? "";
            const tipoMensajeFinal = mensajePago?.classList.contains("payment-success")
                ? "exito"
                : mensajePago?.classList.contains("payment-error")
                    ? "error"
                    : "pendiente";

            registroVentaEnCurso = false;
            actualizarEstadoRecaudo(false);

            if (mensajeFinal) {
                mostrarMensajeEstadoRecaudo(mensajeFinal, tipoMensajeFinal);
            }

            if (notaEstadoVenta && notaFinal) {
                notaEstadoVenta.textContent = notaFinal;
            }

            if (ventaPendienteVerificacion && botonFinalizarVenta) {
                botonFinalizarVenta.disabled = true;
            }

        }

    }

    botonFinalizarVenta?.addEventListener("click", finalizarVenta);

    // Se inicializan los controles sin mostrar errores antes de que el usuario
    // empiece a interactuar con la venta.
    actualizarEstadoRecaudo(false);

    //* ========================================
    //* INICIALIZAR DASHBOARD
    //* ========================================

    async function inicializarDashboard() {

        // Mostrar estados de carga en la lista de clientes y el catálogo.
        mostrarCargaClientes();
        mostrarCargaProductos();

        // Consultar clientes y productos de manera simultánea.
        await Promise.all([

            cargarClientesDashboard(),

            cargarProductosActivos(),

            cargarVentasDashboard(),

        ]);

    }

    //* ========================================
    //* INDICADORES DE VENTAS
    //* ========================================

    // Los dos indicadores permiten alternar de forma independiente entre
    // cantidad de operaciones y valor monetario. Solo cuentan ventas CONFIRMADAS.
    const selectorMetricaVentasHoy = document.querySelector(
        "#selectorMetricaVentasHoy",
    );

    const selectorMetricaTotalVentas = document.querySelector(
        "#selectorMetricaTotalVentas",
    );

    function obtenerFechaNegocio(valor) {

        if (!valor) {
            return null;
        }

        const texto = valor instanceof Date ? "" : String(valor).trim();
        const tieneZonaHoraria = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(texto);

        // Las fechas de MockAPI sin zona horaria representan la hora local
        // registrada por el negocio; conservar su fecha calendario original.
        if (texto && !tieneZonaHoraria) {
            const coincidencia = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

            if (coincidencia) {
                return `${coincidencia[1]}-${coincidencia[2]}-${coincidencia[3]}`;
            }
        }

        const fecha = valor instanceof Date ? valor : new Date(valor);

        if (Number.isNaN(fecha.getTime())) {
            return null;
        }

        const partes = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Bogota",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).formatToParts(fecha);

        const partesFecha = Object.fromEntries(
            partes.map((parte) => [parte.type, parte.value]),
        );

        return `${partesFecha.year}-${partesFecha.month}-${partesFecha.day}`;

    }

    function obtenerFechaActualNegocio() {
        return obtenerFechaNegocio(new Date());
    }

    function esVentaConfirmada(venta) {
        return String(venta.estado_venta ?? "")
            .trim()
            .toLocaleUpperCase("es-CO") === "CONFIRMADA";
    }

    function formatearCantidadVentas(cantidad) {
        return new Intl.NumberFormat("es-CO", {
            maximumFractionDigits: 0,
        }).format(cantidad);
    }

    function sumarTotalVentas(ventas) {

        return ventas.reduce((acumulado, venta) => {
            const valor = venta.total_venta;

            if (valor === null || valor === undefined || String(valor).trim() === "") {
                return acumulado;
            }

            const total = Number(valor);

            return Number.isFinite(total)
                ? acumulado + total
                : acumulado;
        }, 0);

    }

    function actualizarIndicadoresVentasDashboard() {

        const indicadorVentasHoy = document.querySelector(
            "#indicadorVentasHoy",
        );
        const indicadorTotalVentas = document.querySelector(
            "#indicadorTotalVentas",
        );
        const descripcionVentasHoy = document.querySelector(
            "#descripcionVentasHoy",
        );
        const descripcionTotalVentas = document.querySelector(
            "#descripcionTotalVentas",
        );

        if (
            !indicadorVentasHoy ||
            !indicadorTotalVentas ||
            !descripcionVentasHoy ||
            !descripcionTotalVentas
        ) {
            return;
        }

        if (estadoConsultaVentasDashboard === "cargando") {
            indicadorVentasHoy.textContent = "—";
            indicadorTotalVentas.textContent = "—";
            descripcionVentasHoy.textContent = "Consultando ventas confirmadas...";
            descripcionTotalVentas.textContent = "Consultando ventas confirmadas...";
            return;
        }

        if (estadoConsultaVentasDashboard === "error") {
            indicadorVentasHoy.textContent = "—";
            indicadorTotalVentas.textContent = "—";
            descripcionVentasHoy.textContent = "No fue posible consultar este indicador.";
            descripcionTotalVentas.textContent = "No fue posible consultar este indicador.";
            return;
        }

        const ventasConfirmadas = ventasDashboard.filter(esVentaConfirmada);
        const fechaActual = obtenerFechaActualNegocio();
        const ventasConfirmadasHoy = ventasConfirmadas.filter(
            (venta) => obtenerFechaNegocio(venta.fecha_venta) === fechaActual,
        );

        const modoVentasHoy = selectorMetricaVentasHoy?.value ?? "cantidad";
        const modoTotalVentas = selectorMetricaTotalVentas?.value ?? "cantidad";

        if (modoVentasHoy === "dinero") {
            indicadorVentasHoy.textContent = formatearMonedaDashboard(
                sumarTotalVentas(ventasConfirmadasHoy),
            );
            descripcionVentasHoy.textContent = "Valor de ventas confirmadas hoy.";
        } else {
            indicadorVentasHoy.textContent = formatearCantidadVentas(
                ventasConfirmadasHoy.length,
            );
            descripcionVentasHoy.textContent = "Operaciones confirmadas hoy.";
        }

        if (modoTotalVentas === "dinero") {
            indicadorTotalVentas.textContent = formatearMonedaDashboard(
                sumarTotalVentas(ventasConfirmadas),
            );
            descripcionTotalVentas.textContent = "Valor acumulado de ventas confirmadas.";
        } else {
            indicadorTotalVentas.textContent = formatearCantidadVentas(
                ventasConfirmadas.length,
            );
            descripcionTotalVentas.textContent = "Total de operaciones confirmadas.";
        }

    }

    selectorMetricaVentasHoy?.addEventListener(
        "change",
        actualizarIndicadoresVentasDashboard,
    );

    selectorMetricaTotalVentas?.addEventListener(
        "change",
        actualizarIndicadoresVentasDashboard,
    );

    //* ========================================
    //* CONSULTAR VENTAS PARA EL DASHBOARD
    //* ========================================

    async function cargarVentasDashboard() {

        estadoConsultaVentasDashboard = "cargando";
        actualizarIndicadoresVentasDashboard();
        mostrarVentasRecientes();

        try {

            ventasDashboard = await consultarAPI(apiVentas);
            estadoConsultaVentasDashboard = "cargado";
            actualizarIndicadoresVentasDashboard();
            mostrarVentasRecientes();

            console.log(
                "Ventas disponibles para el Dashboard:",
                ventasDashboard.length,
            );

        } catch (error) {

            ventasDashboard = [];
            estadoConsultaVentasDashboard = "error";
            actualizarIndicadoresVentasDashboard();

            console.error(
                "No se pudieron cargar las ventas recientes:",
                error.message,
            );

            mostrarVentasRecientes();

        }

    }

    //* ========================================
    //* MOSTRAR LAS CINCO VENTAS MÁS RECIENTES
    //* ========================================

    function mostrarVentasRecientes() {

        const tablaVentasRecientes = document.querySelector(
            "#tablaVentasRecientes",
        );

        if (!tablaVentasRecientes) {
            return;
        }

        tablaVentasRecientes.replaceChildren();

        if (estadoConsultaVentasDashboard === "cargando") {
            mostrarFilaEstadoVentasRecientes(
                tablaVentasRecientes,
                "Consultando ventas en MockAPI...",
            );
            return;
        }

        if (estadoConsultaVentasDashboard === "error") {
            mostrarFilaEstadoVentasRecientes(
                tablaVentasRecientes,
                "No fue posible cargar las ventas recientes.",
            );
            return;
        }

        if (ventasDashboard.length === 0) {
            mostrarFilaEstadoVentasRecientes(
                tablaVentasRecientes,
                "Todavía no hay ventas registradas.",
            );
            return;
        }

        const ventasRecientes = [...ventasDashboard]
            .sort((ventaA, ventaB) => {
                const fechaA = new Date(ventaA.fecha_venta).getTime();
                const fechaB = new Date(ventaB.fecha_venta).getTime();
                const tiempoA = Number.isFinite(fechaA) ? fechaA : 0;
                const tiempoB = Number.isFinite(fechaB) ? fechaB : 0;

                return tiempoB - tiempoA;
            })
            .slice(0, 5);

        ventasRecientes.forEach((venta) => {

            const fila = document.createElement("tr");

            const idVenta = venta.venta_id ?? venta.id ?? "—";
            const clienteId = venta.cliente_id;
            const cliente = clientesPorIdDashboard.get(String(clienteId));
            const nombreCliente = cliente?.nombre_razon_social
                ?? (clienteId !== undefined && clienteId !== null && clienteId !== ""
                    ? `Cliente #${clienteId}`
                    : "Consumidor final");

            const valores = [
                `#${idVenta}`,
                formatearFechaDashboard(venta.fecha_venta),
                nombreCliente,
                formatearMonedaDashboard(venta.total_venta),
            ];

            valores.forEach((valor) => {
                const celda = document.createElement("td");
                celda.textContent = valor;
                fila.appendChild(celda);
            });

            const celdaEstado = document.createElement("td");
            const etiquetaEstado = document.createElement("span");
            const estado = String(venta.estado_venta ?? "SIN ESTADO")
                .toLocaleUpperCase("es-CO");

            etiquetaEstado.className = "recent-sale-status";
            etiquetaEstado.textContent = estado;
            celdaEstado.appendChild(etiquetaEstado);
            fila.appendChild(celdaEstado);

            tablaVentasRecientes.appendChild(fila);

        });

    }

    function mostrarFilaEstadoVentasRecientes(tabla, mensaje) {

        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 5;
        celda.className = "empty-table";
        celda.textContent = mensaje;

        fila.appendChild(celda);
        tabla.appendChild(fila);

    }

    function formatearFechaDashboard(valor) {

        if (!valor) {
            return "—";
        }

        const fecha = new Date(valor);

        if (Number.isNaN(fecha.getTime())) {
            return String(valor);
        }

        return new Intl.DateTimeFormat("es-CO", {
            dateStyle: "short",
            timeStyle: "short",
        }).format(fecha);

    }

    function formatearMonedaDashboard(valor) {

        const numero = Number(valor);

        if (!Number.isFinite(numero)) {
            return "—";
        }

        return new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0,
        }).format(numero);

    }

    //* ========================================
    //* CONSULTAR CLIENTES ACTIVOS PARA VENTAS
    //* ========================================

    async function cargarClientesDashboard() {

        try {

            // Consultar todos los clientes registrados en MockAPI.
            const clientesRegistrados = await consultarAPI(apiClientes);

            // Conservar todos los clientes para resolver nombres en ventas antiguas.
            clientesPorIdDashboard = new Map();

            clientesRegistrados.forEach((cliente) => {
                const clienteId = cliente.cliente_id ?? cliente.id;

                if (clienteId !== undefined && clienteId !== null) {
                    clientesPorIdDashboard.set(String(clienteId), cliente);
                }
            });

            // Conservar únicamente clientes activos para nuevas ventas.
            clientesActivos = clientesRegistrados.filter(
                (cliente) => cliente.activo === true,
            );

            // Conservar la selección solo si el cliente continúa activo.
            const clienteSeleccionado = selectorClienteVenta?.value ?? "";

            const seleccionSigueActiva = clientesActivos.some(
                (cliente) =>
                    String(cliente.cliente_id ?? cliente.id) ===
                    String(clienteSeleccionado),
            );

            if (!seleccionSigueActiva && selectorClienteVenta) {
                selectorClienteVenta.value = "";
            }

            // Renderizar la lista inicial y actualizar el resumen de selección.
            renderizarListaClientesVenta();
            actualizarTextoClienteSeleccionado();
            actualizarBotonListaClientes();

            // El indicador "Clientes registrados" cuenta activos e inactivos.
            totalClientesRegistrados = clientesRegistrados.length;

            refrescarIndicadoresDashboard();
            mostrarVentasRecientes();
            actualizarEstadoRecaudo(false);

            console.log(
                "Total de clientes registrados:",
                totalClientesRegistrados,
            );

            console.log(
                "Clientes activos disponibles para ventas:",
                clientesActivos.length,
            );

        } catch (error) {

            console.error(
                "No se pudieron cargar los clientes para el Dashboard:",
                error.message,
            );

            totalClientesRegistrados = null;
            clientesPorIdDashboard = new Map();
            clientesActivos = [];
            if (selectorClienteVenta) {
                selectorClienteVenta.value = "";
            }
            actualizarTextoClienteSeleccionado();

            refrescarIndicadoresDashboard();
            mostrarVentasRecientes();
            actualizarEstadoRecaudo(true);

            mostrarErrorClientes();

        }

    }

    //* ========================================
    //* CONSULTAR PRODUCTOS ACTIVOS PARA VENTAS
    //* ========================================

    async function cargarProductosActivos() {

        try {

            // Consultar el catálogo de productos.
            const productos = await consultarAPI(apiProductos);

            // Conservar únicamente los productos activos.
            productosActivos = productos.filter(
                (producto) => producto.activo === true,
            );

            // Mostrar los productos activos conservando el filtro de búsqueda actual.
            aplicarFiltroProductos();

            // Actualizar el indicador general de productos.
            totalProductosActivos = productosActivos.length;

            refrescarIndicadoresDashboard();

            console.log(
                "Productos activos disponibles para ventas:",
                productosActivos.length,
            );

        } catch (error) {

            console.error(
                "No se pudieron cargar los productos para ventas:",
                error.message,
            );

            mostrarErrorProductos();

        }

    }

    //* ========================================
    //* EJECUTAR LA CARGA INICIAL DEL DASHBOARD
    //* ========================================

    inicializarDashboard();

    //* ========================================
    //* ACTUALIZAR INFORMACIÓN AL REGRESAR AL DASHBOARD
    //* ========================================

    window.addEventListener("pageshow", async (evento) => {

        if (evento.persisted) {

            await Promise.all([

                cargarClientesDashboard(),

                cargarProductosActivos(),

                cargarVentasDashboard(),

            ]);

        }

    });

}