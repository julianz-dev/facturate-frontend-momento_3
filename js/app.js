import { gco_verificarSesion } from "./auth.js";

import {
    gco_consultarAPI,
    gco_actualizarAPI,
    gco_crearAPI,
    gco_apiClientes,
    gco_apiProductos,
} from "./api.js";

import {
    gco_mostrarCargaClientes,
    gco_mostrarCargaProductos,
    gco_mostrarClientes,
    gco_mostrarProductos,
    gco_actualizarIndicadores,
    gco_mostrarErrorClientes,
    gco_mostrarErrorProductos,
    gco_mostrarTablaClientes,
    gco_actualizarIndicadoresClientes,
    gco_mostrarErrorTablaClientes,
    gco_mostrarCarrito,
} from "./ui.js";

// ========================================
// VARIABLES DEL DASHBOARD
// ========================================

// Almacenar todos los clientes consultados desde la API
let gco_clientes = [];

// Almacenar únicamente los clientes activos para el selector de venta
let gco_clientesActivos = [];

// Almacenar los productos disponibles para la venta
let gco_productosActivos = [];

// Almacenar los productos agregados al carrito
let gco_carrito = [];

// Identificar el cliente que se está editando
let gco_clienteEnEdicion = null;

// Identificar si se está editando el cliente genérico
let gco_clienteGenericoEnEdicion = false;

// ========================================
// VERIFICAR AUTORIZACIÓN DE ACCESO
// ========================================

const gco_accesoAutorizado = gco_verificarSesion();

if (gco_accesoAutorizado) {
    console.log("Sesión validada. Acceso autorizado al dashboard.");

    // Seleccionar botón de cierre de sesión
    const gco_btnCerrarSesion = document.querySelector("#btnCerrarSesion");

    // Escuchar evento de cierre de sesión
    gco_btnCerrarSesion.addEventListener("click", () => {
        sessionStorage.removeItem("gco_sesionActiva");

        window.location.replace("login.html");
    });

    // ========================================
    // MOSTRAR Y OCULTAR CATÁLOGO DE PRODUCTOS
    // ========================================

    const gco_btnAlternarCatalogo = document.querySelector(
        "#btnAlternarCatalogo",
    );

    const gco_contenedorCatalogo = document.querySelector(
        "#contenedorCatalogoProductos",
    );

    gco_btnAlternarCatalogo.addEventListener("click", () => {
        const gco_catalogoVisible = !gco_contenedorCatalogo.hidden;

        gco_contenedorCatalogo.hidden = gco_catalogoVisible;
        gco_btnAlternarCatalogo.textContent = gco_catalogoVisible
            ? "Mostrar productos"
            : "Ocultar productos";

        gco_btnAlternarCatalogo.setAttribute(
            "aria-expanded",
            String(!gco_catalogoVisible),
        );
    });

    // ========================================
    // BUSCADOR DE PRODUCTOS
    // ========================================

    const gco_buscarProducto = document.querySelector("#buscarProducto");

    gco_buscarProducto.addEventListener("input", () => {
        const gco_terminoBusqueda = gco_buscarProducto.value
            .trim()
            .toLowerCase();

        const gco_productosFiltrados = gco_productosActivos.filter(
            (gco_producto) => {
                const gco_nombreProducto = String(
                    gco_producto.nombre_producto ?? "",
                ).toLowerCase();

                const gco_codigoProducto = String(
                    gco_producto.codigo_producto ?? "",
                ).toLowerCase();

                return (
                    gco_nombreProducto.includes(gco_terminoBusqueda) ||
                    gco_codigoProducto.includes(gco_terminoBusqueda)
                );
            },
        );

        // Actualizar catálogo
        gco_mostrarProductos(gco_productosFiltrados);
    });

    // ========================================
    // BUSCADOR Y FILTRO DE CLIENTES
    // ========================================

    const gco_buscarCliente = document.querySelector("#buscarCliente");
    const gco_filtroEstadoCliente = document.querySelector("#filtroEstadoCliente");

    // Filtrar la tabla al escribir o cambiar el estado
    gco_buscarCliente.addEventListener("input", gco_aplicarFiltrosClientes);
    gco_filtroEstadoCliente.addEventListener("change", gco_aplicarFiltrosClientes);

    // ========================================
    // GESTIONAR MODAL DE CLIENTES
    // ========================================

    // Seleccionar elementos del formulario
    const gco_formularioCliente = document.querySelector("#formularioCliente");

    const gco_tituloModalCliente = document.querySelector(
        "#tituloModalCliente"
    );

    const gco_nombreRazonSocialCliente = document.querySelector(
        "#nombreRazonSocialCliente"
    );

    const gco_tipoDocumentoCliente = document.querySelector(
        "#tipoDocumentoCliente"
    );

    const gco_numeroDocumentoCliente = document.querySelector(
        "#numeroDocumentoCliente"
    );

    const gco_esGenericoCliente = document.querySelector(
        "#esGenericoCliente"
    );

    const gco_activoCliente = document.querySelector(
        "#activoCliente"
    );

    const gco_btnGuardarCliente = document.querySelector(
        "#btnGuardarCliente"
    );

    const gco_btnNuevoCliente = document.querySelector(
        "#btnNuevoCliente"
    );

    const gco_tablaClientes = document.querySelector("#tablaClientes");

    const gco_modalClienteElemento = document.querySelector("#modalCliente");

    // Obtener instancia del modal de Bootstrap
    const gco_modalCliente = bootstrap.Modal.getOrCreateInstance(
        gco_modalClienteElemento
    );

    // ========================================
    // CONTROLAR CLIENTE GENÉRICO
    // ========================================

    function gco_actualizarCamposDocumentoCliente() {

        const gco_esGenerico = gco_esGenericoCliente.checked;

        // Verificar si ya existe otro cliente genérico
        const gco_existeOtroGenerico = gco_clientes.some(
            (gco_cliente) =>
                gco_cliente.es_generico === true &&
                String(gco_cliente.cliente_id ?? gco_cliente.id) !==
                String(gco_clienteEnEdicion)
        );

        // Evitar duplicar el cliente genérico
        gco_esGenericoCliente.disabled =
            gco_clienteGenericoEnEdicion || gco_existeOtroGenerico;

        // Bloquear el nombre cuando es cliente genérico
        gco_nombreRazonSocialCliente.readOnly = gco_esGenerico;

        // Controlar campos del documento
        gco_tipoDocumentoCliente.disabled = gco_esGenerico;
        gco_numeroDocumentoCliente.disabled = gco_esGenerico;

        // Controlar obligatoriedad
        gco_tipoDocumentoCliente.required = !gco_esGenerico;
        gco_numeroDocumentoCliente.required = !gco_esGenerico;

        if (gco_esGenerico) {

            // Asignar nombre fijo
            gco_nombreRazonSocialCliente.value = "Consumidor final";

            // Limpiar documentos
            gco_tipoDocumentoCliente.value = "";
            gco_numeroDocumentoCliente.value = "";

            // El cliente genérico siempre debe estar activo
            gco_activoCliente.checked = true;
            gco_activoCliente.disabled = true;

        } else {

            // Restaurar disponibilidad del estado
            gco_activoCliente.disabled = false;

        }

    }

    // Escuchar cambios en la opción cliente genérico
    gco_esGenericoCliente.addEventListener(
        "change",
        gco_actualizarCamposDocumentoCliente
    );

    // ========================================
    // PREPARAR MODAL PARA NUEVO CLIENTE
    // ========================================

    gco_btnNuevoCliente.addEventListener("click", () => {

        // Reiniciar identificación del cliente
        gco_clienteEnEdicion = null;
        gco_clienteGenericoEnEdicion = false;

        // Limpiar formulario
        gco_formularioCliente.reset();

        // Restaurar título y botón
        gco_tituloModalCliente.textContent = "Nuevo cliente";
        gco_btnGuardarCliente.textContent = "Guardar cliente";

        // Habilitar el registro de nuevos clientes
        gco_btnGuardarCliente.disabled = false;

        // Actualizar disponibilidad de campos
        gco_actualizarCamposDocumentoCliente();

    });

    // ========================================
    // REGISTRAR Y EDITAR CLIENTES
    // ========================================

    gco_formularioCliente.addEventListener("submit", async (gco_evento) => {

        // Evitar el envío tradicional del formulario
        gco_evento.preventDefault();

        // Identificar si estamos creando o editando
        const gco_esEdicion = gco_clienteEnEdicion !== null;

        // Proteger el cliente genérico
        if (gco_esEdicion && gco_clienteGenericoEnEdicion) {

            window.alert("El cliente genérico está protegido.");

            return;

        }

        // Validar campos obligatorios
        if (!gco_formularioCliente.checkValidity()) {

            gco_formularioCliente.reportValidity();

            return;

        }

        // Identificar tipo de cliente
        const gco_esGenerico = gco_esGenericoCliente.checked;

        // Normalizar datos de texto
        const gco_nombreValidado =
            gco_nombreRazonSocialCliente.value.trim();

        const gco_tipoDocumentoValidado =
            gco_tipoDocumentoCliente.value.trim().toUpperCase();

        const gco_documentoValidado =
            gco_numeroDocumentoCliente.value.trim();

        // Validar nombre
        if (!gco_esGenerico && !gco_nombreValidado) {

            window.alert("Ingresa un nombre o razón social válido.");

            gco_nombreRazonSocialCliente.focus();

            return;

        }

        // Validar documento
        if (!gco_esGenerico && !gco_documentoValidado) {

            window.alert("Ingresa un número de documento válido.");

            gco_numeroDocumentoCliente.focus();

            return;

        }

        // Evitar duplicar el cliente genérico
        const gco_genericoDuplicado = gco_esGenerico &&
            gco_clientes.some(
                (gco_cliente) =>
                    gco_cliente.es_generico === true &&
                    String(gco_cliente.cliente_id ?? gco_cliente.id) !==
                    String(gco_clienteEnEdicion)
            );

        if (gco_genericoDuplicado) {

            window.alert("Ya existe un cliente genérico registrado.");

            return;

        }

        // ========================================
        // VALIDAR DOCUMENTOS DUPLICADOS
        // ========================================

        const gco_documentoDuplicado = !gco_esGenerico &&
            gco_clientes.some((gco_cliente) => {

                const gco_idRegistrado =
                    gco_cliente.cliente_id ?? gco_cliente.id;

                const gco_mismoTipoDocumento =
                    String(gco_cliente.tipo_documento ?? "")
                        .trim()
                        .toUpperCase() === gco_tipoDocumentoValidado;

                const gco_mismoNumeroDocumento =
                    String(gco_cliente.numero_documento ?? "").trim() ===
                    gco_documentoValidado;

                const gco_esOtroCliente =
                    String(gco_idRegistrado) !==
                    String(gco_clienteEnEdicion);

                return (
                    gco_cliente.es_generico !== true &&
                    gco_mismoTipoDocumento &&
                    gco_mismoNumeroDocumento &&
                    gco_esOtroCliente
                );

            });

        if (gco_documentoDuplicado) {

            window.alert(
                "Ya existe un cliente registrado con este tipo y número de documento."
            );

            gco_numeroDocumentoCliente.focus();

            return;

        }

        // ========================================
        // IDENTIFICAR CLIENTE ORIGINAL
        // ========================================

        let gco_clienteOriginal = null;

        let gco_indiceCliente = -1;

        if (gco_esEdicion) {

            gco_indiceCliente = gco_clientes.findIndex(
                (gco_cliente) =>
                    String(gco_cliente.cliente_id ?? gco_cliente.id) ===
                    String(gco_clienteEnEdicion)
            );

            if (gco_indiceCliente === -1) {

                window.alert(
                    "No se encontró el cliente que deseas actualizar."
                );

                return;

            }

            gco_clienteOriginal = gco_clientes[gco_indiceCliente];

        }

        // ========================================
        // CONSTRUIR DATOS DEL CLIENTE
        // ========================================

        const gco_datosCliente = {

            // Conservar el negocio original al editar
            negocio_id: gco_clienteOriginal?.negocio_id ?? 1,

            tipo_documento: gco_esGenerico
                ? null
                : gco_tipoDocumentoValidado,

            numero_documento: gco_esGenerico
                ? null
                : gco_documentoValidado,

            nombre_razon_social: gco_esGenerico
                ? "Consumidor final"
                : gco_nombreValidado,

            activo: gco_esGenerico
                ? true
                : gco_activoCliente.checked,

            es_generico: gco_esGenerico,

        };

        // Evitar solicitudes duplicadas
        gco_btnGuardarCliente.disabled = true;

        gco_btnGuardarCliente.textContent = gco_esEdicion
            ? "Guardando cambios..."
            : "Guardando...";

        try {

            let gco_clienteGuardado;

            // ========================================
            // ACTUALIZAR CLIENTE EXISTENTE (PUT)
            // ========================================

            if (gco_esEdicion) {

                const gco_urlCliente =
                    `${gco_apiClientes}/${encodeURIComponent(gco_clienteEnEdicion)}`;

                gco_clienteGuardado = await gco_actualizarAPI(
                    gco_urlCliente,
                    gco_datosCliente
                );

                // Actualizar registro en la colección local
                gco_clientes[gco_indiceCliente] = {

                    ...gco_clienteOriginal,

                    ...gco_datosCliente,

                    ...gco_clienteGuardado,

                };

            } else {

                // ========================================
                // REGISTRAR NUEVO CLIENTE (POST)
                // ========================================

                gco_clienteGuardado = await gco_crearAPI(
                    gco_apiClientes,
                    gco_datosCliente
                );

                // Incorporar nuevo cliente a la colección
                gco_clientes.push(gco_clienteGuardado);

            }

            // ========================================
            // ACTUALIZAR COLECCIONES E INTERFAZ
            // ========================================

            // Conservar cliente seleccionado en la venta
            const gco_selectorCliente = document.querySelector(
                "#selectorCliente"
            );

            const gco_clienteVentaActual = gco_selectorCliente.value;

            // Reconstruir colección de clientes activos
            gco_clientesActivos = gco_clientes.filter(
                (gco_cliente) => gco_cliente.activo === true
            );

            // Actualizar selector de ventas
            gco_mostrarClientes(gco_clientesActivos);

            // Restaurar selección anterior si sigue disponible
            const gco_seleccionSigueActiva = gco_clientesActivos.some(
                (gco_cliente) =>
                    String(gco_cliente.cliente_id ?? gco_cliente.id) ===
                    String(gco_clienteVentaActual)
            );

            if (gco_seleccionSigueActiva) {

                gco_selectorCliente.value = gco_clienteVentaActual;

            }

            // Actualizar tabla e indicadores administrativos
            gco_aplicarFiltrosClientes();

            gco_actualizarIndicadoresClientes(gco_clientes);

            // Actualizar indicador general del dashboard
            gco_actualizarIndicadores(
                gco_clientesActivos.length,
                document.querySelector("#indicadorProductos").textContent
            );

            // ========================================
            // RESTAURAR FORMULARIO
            // ========================================

            gco_formularioCliente.reset();

            gco_clienteEnEdicion = null;

            gco_clienteGenericoEnEdicion = false;

            gco_tituloModalCliente.textContent = "Nuevo cliente";

            gco_actualizarCamposDocumentoCliente();

            // Cerrar modal
            gco_modalCliente.hide();

            // Confirmar operación
            console.log(
                gco_esEdicion
                    ? "Cliente actualizado correctamente:"
                    : "Cliente registrado correctamente:",
                gco_clienteGuardado
            );

            window.alert(
                gco_esEdicion
                    ? "Cliente actualizado correctamente."
                    : "Cliente registrado correctamente."
            );

        } catch (gco_error) {

            console.error(
                gco_esEdicion
                    ? "No fue posible actualizar el cliente:"
                    : "No fue posible registrar el cliente:",
                gco_error.message
            );

            window.alert(
                gco_esEdicion
                    ? "No fue posible actualizar el cliente. Intenta nuevamente."
                    : "No fue posible registrar el cliente. Intenta nuevamente."
            );

        } finally {

            // Restaurar botón de guardado
            gco_btnGuardarCliente.disabled = false;

            gco_btnGuardarCliente.textContent =
                gco_clienteEnEdicion !== null
                    ? "Guardar cambios"
                    : "Guardar cliente";

        }

    });

    // ========================================
    // EDITAR Y CAMBIAR ESTADO DE CLIENTES
    // ========================================

    gco_tablaClientes.addEventListener("click", async (gco_evento) => {

        // Identificar botón presionado
        const gco_botonAccion = gco_evento.target.closest("[data-accion]");

        if (
            !gco_botonAccion ||
            !gco_tablaClientes.contains(gco_botonAccion)
        ) {
            return;
        }

        // Obtener acción e identificador
        const gco_accion = gco_botonAccion.dataset.accion;
        const gco_clienteId = gco_botonAccion.dataset.clienteId;

        // Buscar cliente seleccionado
        const gco_clienteSeleccionado = gco_clientes.find(
            (gco_cliente) =>
                String(gco_cliente.cliente_id ?? gco_cliente.id) ===
                String(gco_clienteId)
        );

        if (!gco_clienteSeleccionado) {
            console.error("No se encontró el cliente seleccionado.");
            return;
        }

        // ========================================
        // EDITAR CLIENTE
        // ========================================

        if (gco_accion === "editar-cliente") {

            // Conservar identificador
            gco_clienteEnEdicion =
                gco_clienteSeleccionado.cliente_id ??
                gco_clienteSeleccionado.id;

            // Identificar si es cliente genérico
            gco_clienteGenericoEnEdicion =
                gco_clienteSeleccionado.es_generico === true;

            // Cargar información en el formulario
            gco_nombreRazonSocialCliente.value =
                gco_clienteSeleccionado.nombre_razon_social ?? "";

            gco_tipoDocumentoCliente.value =
                gco_clienteSeleccionado.tipo_documento ?? "";

            gco_numeroDocumentoCliente.value =
                gco_clienteSeleccionado.numero_documento ?? "";

            gco_esGenericoCliente.checked =
                gco_clienteSeleccionado.es_generico === true;

            gco_activoCliente.checked =
                gco_clienteSeleccionado.activo === true;

            // Actualizar campos según el tipo de cliente
            gco_actualizarCamposDocumentoCliente();

            // Cambiar título y botón
            gco_tituloModalCliente.textContent = "Editar cliente";
            gco_btnGuardarCliente.textContent = "Guardar cambios";

            // Deshabilitar únicamente si se trata del cliente genérico
            gco_btnGuardarCliente.disabled = gco_clienteGenericoEnEdicion;

            // Abrir modal
            gco_modalCliente.show();

            return;

        }

        // ========================================
        // ACTIVAR O INACTIVAR CLIENTE
        // ========================================

        if (gco_accion === "cambiar-estado-cliente") {

            // Protección adicional del cliente genérico
            if (gco_clienteSeleccionado.es_generico === true) {
                console.warn("El cliente genérico está protegido.");
                return;
            }

            // Determinar nuevo estado
            const gco_nuevoEstado = !gco_clienteSeleccionado.activo;

            const gco_accionEstado = gco_nuevoEstado
                ? "activar"
                : "inactivar";

            // Solicitar confirmación
            const gco_confirmacion = window.confirm(
                `¿Confirmas que deseas ${gco_accionEstado} al cliente "${gco_clienteSeleccionado.nombre_razon_social}"?`
            );

            if (!gco_confirmacion) {
                return;
            }

            // Evitar múltiples solicitudes
            gco_botonAccion.disabled = true;
            gco_botonAccion.textContent = "Actualizando...";

            try {

                // Construir URL del cliente
                const gco_urlCliente =
                    `${gco_apiClientes}/${encodeURIComponent(gco_clienteId)}`;

                // Actualizar estado en MockAPI
                const gco_clienteActualizado = await gco_actualizarAPI(
                    gco_urlCliente,
                    {
                        activo: gco_nuevoEstado,
                    }
                );

                // Buscar posición del cliente en la colección
                const gco_indiceCliente = gco_clientes.findIndex(
                    (gco_cliente) =>
                        String(gco_cliente.cliente_id ?? gco_cliente.id) ===
                        String(gco_clienteId)
                );

                // Actualizar colección local
                if (gco_indiceCliente !== -1) {

                    gco_clientes[gco_indiceCliente] = {
                        ...gco_clientes[gco_indiceCliente],
                        ...gco_clienteActualizado,
                    };

                }

                // Conservar cliente actualmente seleccionado en la venta
                const gco_selectorCliente = document.querySelector(
                    "#selectorCliente"
                );

                const gco_clienteVentaActual = gco_selectorCliente.value;

                // Actualizar colección de clientes activos
                gco_clientesActivos = gco_clientes.filter(
                    (gco_cliente) => gco_cliente.activo === true
                );

                // Actualizar selector de venta
                gco_mostrarClientes(gco_clientesActivos);

                // Restaurar selección si el cliente sigue activo
                const gco_seleccionSigueActiva = gco_clientesActivos.some(
                    (gco_cliente) =>
                        String(gco_cliente.cliente_id ?? gco_cliente.id) ===
                        String(gco_clienteVentaActual)
                );

                if (gco_seleccionSigueActiva) {
                    gco_selectorCliente.value = gco_clienteVentaActual;
                }

                // Actualizar tabla e indicadores
                gco_aplicarFiltrosClientes();
                gco_actualizarIndicadoresClientes(gco_clientes);

                gco_actualizarIndicadores(
                    gco_clientesActivos.length,
                    document.querySelector("#indicadorProductos").textContent
                );

                console.log(
                    `Cliente ${gco_accionEstado} correctamente:`,
                    gco_clienteActualizado
                );

            } catch (gco_error) {

                console.error(
                    "No fue posible actualizar el estado del cliente:",
                    gco_error.message
                );

                window.alert(
                    "No fue posible actualizar el cliente. Intenta nuevamente."
                );

                // Restaurar botón si ocurre un error
                gco_botonAccion.disabled = false;

                gco_botonAccion.textContent =
                    gco_clienteSeleccionado.activo
                        ? "Inactivar"
                        : "Activar";

            }

        }

    });

    // ========================================
    // AGREGAR PRODUCTOS AL CARRITO
    // ========================================

    const gco_listaProductos = document.querySelector("#listaProductos");
    const gco_mensajeProductoAgregado = document.querySelector(
        "#mensajeProductoAgregado",
    );

    let gco_temporizadorMensajeProducto;

    // Mostrar confirmación después de agregar un producto.
    function gco_mostrarMensajeProductoAgregado() {
        gco_mensajeProductoAgregado.textContent = "Producto agregado.";
        gco_mensajeProductoAgregado.hidden = false;

        clearTimeout(gco_temporizadorMensajeProducto);

        gco_temporizadorMensajeProducto = setTimeout(() => {
            gco_mensajeProductoAgregado.hidden = true;
            gco_mensajeProductoAgregado.textContent = "";
        }, 2500);
    }

    // Delegación de eventos
    gco_listaProductos.addEventListener("click", (gco_evento) => {
        // Identificar el botón presionado
        const gco_botonAgregar = gco_evento.target.closest(
            '[data-accion="agregar-carrito"]',
        );

        if (
            !gco_botonAgregar ||
            !gco_listaProductos.contains(gco_botonAgregar)
        ) {
            return;
        }

        // Obtener identificador del producto
        const gco_productoId = gco_botonAgregar.dataset.productoId;

        // Buscar producto en el catálogo
        const gco_productoSeleccionado = gco_productosActivos.find(
            (gco_producto) =>
                String(gco_producto.producto_id) === String(gco_productoId),
        );

        if (!gco_productoSeleccionado) {
            console.error("No se encontró el producto seleccionado.");

            return;
        }

        // Buscar producto existente en el carrito
        const gco_productoExistente = gco_carrito.find(
            (gco_producto) =>
                String(gco_producto.producto_id) === String(gco_productoId),
        );

        if (gco_productoExistente) {
            // Incrementar cantidad
            gco_productoExistente.cantidad++;
        } else {
            // Incorporar producto nuevo
            gco_carrito.push({
                producto_id: gco_productoSeleccionado.producto_id,
                nombre_producto: gco_productoSeleccionado.nombre_producto,
                codigo_producto: gco_productoSeleccionado.codigo_producto,
                precio_unitario: Number(gco_productoSeleccionado.precio_venta),
                cantidad: 1,
            });
        }

        console.log("Carrito actualizado:");

        console.table(gco_carrito);

        // Actualizar representación visual del carrito
        gco_mostrarCarrito(gco_carrito);

        // Confirmar que el producto fue agregado.
        gco_mostrarMensajeProductoAgregado();
    });

    // ========================================
    // ADMINISTRAR PRODUCTOS DEL CARRITO
    // ========================================

    const gco_listaCarrito = document.querySelector("#listaCarrito");

    // Delegación de eventos para los controles del carrito
    gco_listaCarrito.addEventListener("click", (gco_evento) => {
        // Identificar el botón presionado
        const gco_botonControl = gco_evento.target.closest("[data-accion]");

        if (!gco_botonControl || !gco_listaCarrito.contains(gco_botonControl)) {
            return;
        }

        // Obtener datos del producto y la acción
        const gco_productoId = gco_botonControl.dataset.productoId;
        const gco_accion = gco_botonControl.dataset.accion;

        // Buscar producto dentro del carrito
        const gco_productoExistente = gco_carrito.find(
            (gco_producto) =>
                String(gco_producto.producto_id) === String(gco_productoId),
        );

        if (!gco_productoExistente) {
            return;
        }

        // Ejecutar acción seleccionada
        if (gco_accion === "incrementar-cantidad") {
            gco_productoExistente.cantidad++;
        } else if (gco_accion === "disminuir-cantidad") {
            if (gco_productoExistente.cantidad > 1) {
                gco_productoExistente.cantidad--;
            }
        } else if (gco_accion === "eliminar-producto") {
            const gco_indiceProducto = gco_carrito.findIndex(
                (gco_producto) =>
                    String(gco_producto.producto_id) === String(gco_productoId),
            );

            if (gco_indiceProducto !== -1) {
                gco_carrito.splice(gco_indiceProducto, 1);
            }
        }

        // Actualizar carrito y totales
        gco_mostrarCarrito(gco_carrito);

        console.log("Carrito actualizado:");
        console.table(gco_carrito);
    });

    // ========================================
    // MOSTRAR CARRITO INICIAL
    // ========================================

    gco_mostrarCarrito(gco_carrito);

    // Iniciar carga de información
    gco_inicializarDashboard();
}

// ========================================
// INICIALIZAR DASHBOARD
// ========================================

async function gco_inicializarDashboard() {
    // Mostrar estados de carga
    gco_mostrarCargaClientes();
    gco_mostrarCargaProductos();

    // Consultar ambas API
    await Promise.all([gco_cargarClientes(), gco_cargarProductos()]);
}

// ========================================
// CONSULTAR CLIENTES
// ========================================

async function gco_cargarClientes() {
    try {
        // Consultar y conservar todos los clientes
        gco_clientes = await gco_consultarAPI(gco_apiClientes);

        // Separar los clientes activos para el proceso de venta
        gco_clientesActivos = gco_clientes.filter(
            (gco_cliente) => gco_cliente.activo === true,
        );

        // Mostrar únicamente clientes activos en el selector de venta
        gco_mostrarClientes(gco_clientesActivos);

        // Mostrar todos los clientes en la tabla administrativa
        gco_aplicarFiltrosClientes();

        // Actualizar indicadores de administración
        gco_actualizarIndicadoresClientes(gco_clientes);

        // Actualizar indicador general de clientes del dashboard
        gco_actualizarIndicadores(
            gco_clientesActivos.length,
            document.querySelector("#indicadorProductos").textContent,
        );

        console.log("Total de clientes consultados:", gco_clientes.length);
        console.log("Clientes activos para ventas:", gco_clientesActivos.length);
    } catch (gco_error) {
        console.error("No se pudieron cargar los clientes:", gco_error.message);

        // Mostrar errores tanto en el selector de venta como en administración
        gco_mostrarErrorClientes();
        gco_mostrarErrorTablaClientes();
    }
}

// ========================================
// APLICAR BÚSQUEDA Y FILTRO DE CLIENTES
// ========================================

function gco_aplicarFiltrosClientes() {
    const gco_buscarCliente = document.querySelector("#buscarCliente");
    const gco_filtroEstadoCliente = document.querySelector("#filtroEstadoCliente");

    const gco_terminoBusqueda = gco_buscarCliente.value.trim().toLowerCase();
    const gco_estadoSeleccionado = gco_filtroEstadoCliente.value;

    // Filtrar los clientes sin modificar la colección original
    const gco_clientesFiltrados = gco_clientes.filter((gco_cliente) => {
        const gco_nombre = String(
            gco_cliente.nombre_razon_social ?? "",
        ).toLowerCase();

        const gco_tipoDocumento = String(
            gco_cliente.tipo_documento ?? "",
        ).toLowerCase();

        const gco_numeroDocumento = String(
            gco_cliente.numero_documento ?? "",
        ).toLowerCase();

        const gco_idCliente = String(
            gco_cliente.cliente_id ?? "",
        ).toLowerCase();

        const gco_coincideBusqueda =
            gco_nombre.includes(gco_terminoBusqueda) ||
            gco_tipoDocumento.includes(gco_terminoBusqueda) ||
            gco_numeroDocumento.includes(gco_terminoBusqueda) ||
            gco_idCliente.includes(gco_terminoBusqueda);

        let gco_coincideEstado = true;

        if (gco_estadoSeleccionado === "ACTIVOS") {
            gco_coincideEstado = gco_cliente.activo === true;
        } else if (gco_estadoSeleccionado === "INACTIVOS") {
            gco_coincideEstado = gco_cliente.activo === false;
        }

        return gco_coincideBusqueda && gco_coincideEstado;
    });

    // Actualizar la tabla con los resultados filtrados
    gco_mostrarTablaClientes(gco_clientesFiltrados);
}


// ========================================
// CONSULTAR PRODUCTOS
// ========================================

async function gco_cargarProductos() {
    try {
        const gco_productos = await gco_consultarAPI(gco_apiProductos);

        // Obtener únicamente productos activos
        gco_productosActivos = gco_productos.filter(
            (gco_producto) => gco_producto.activo === true,
        );

        // Mostrar productos en el catálogo
        gco_mostrarProductos(gco_productosActivos);

        // Actualizar indicador de productos
        gco_actualizarIndicadores(
            document.querySelector("#indicadorClientes").textContent,
            gco_productosActivos.length,
        );

        console.log("Productos cargados:", gco_productosActivos.length);
    } catch (gco_error) {
        console.error(
            "No se pudieron cargar los productos:",
            gco_error.message,
        );

        gco_mostrarErrorProductos();
    }
}
