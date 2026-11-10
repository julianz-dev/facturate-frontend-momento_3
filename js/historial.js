import { verificarSesion } from "./auth.js";

import {
    consultarAPI,
    apiClientes,
    apiVentas,
    apiDetallesVenta,
} from "./api.js";

//* ========================================
//* VARIABLES DEL MÓDULO DE HISTORIAL
//* ========================================

// Registros originales recibidos desde MockAPI.
let ventas = [];
let clientes = [];

// Los detalles se consultan la primera vez que se abre una venta.
// Se conservan en memoria para no repetir la misma petición en cada modal.
let detallesVenta = null;

// Relaciona el identificador del cliente con su registro.
let clientesPorId = new Map();

//* ========================================
//* VERIFICAR AUTORIZACIÓN DE ACCESO
//* ========================================

const accesoAutorizado = verificarSesion();

if (accesoAutorizado) {
    inicializarModuloHistorial();
}

//* ========================================
//* INICIALIZAR MÓDULO DE HISTORIAL
//* ========================================

function inicializarModuloHistorial() {

    const elementos = {
        btnCerrarSesion: document.querySelector("#btnCerrarSesion"),
        buscar: document.querySelector("#buscarVenta"),
        fechaDesde: document.querySelector("#fechaDesde"),
        fechaHasta: document.querySelector("#fechaHasta"),
        filtroEstado: document.querySelector("#filtroEstadoVenta"),
        orden: document.querySelector("#ordenVentas"),
        btnLimpiarFiltros: document.querySelector("#btnLimpiarFiltros"),
        mensaje: document.querySelector("#mensajeEstadoHistorial"),
        tabla: document.querySelector("#tablaVentas"),
        modal: document.querySelector("#modalDetalleVenta"),
        identificadorDetalle: document.querySelector("#ventaDetalleIdentificador"),
        fechaDetalle: document.querySelector("#ventaDetalleFecha"),
        clienteDetalle: document.querySelector("#ventaDetalleCliente"),
        estadoDetalle: document.querySelector("#ventaDetalleEstado"),
        metodoPagoDetalle: document.querySelector("#detalleMetodoPago"),
        tablaDetalles: document.querySelector("#tablaDetallesVenta"),
        subtotalDetalle: document.querySelector("#detalleSubtotal"),
        descuentoDetalle: document.querySelector("#detalleDescuento"),
        impuestoDetalle: document.querySelector("#detalleImpuesto"),
        totalDetalle: document.querySelector("#detalleTotal"),
        valorRecibidoDetalle: document.querySelector("#detalleValorRecibido"),
        cambioDetalle: document.querySelector("#detalleCambio"),
    };

    //* ========================================
    //* VALIDAR ELEMENTOS DEL HTML
    //* ========================================

    const elementosFaltantes = Object.entries(elementos)
        .filter(([, elemento]) => !elemento)
        .map(([nombre]) => nombre);

    if (elementosFaltantes.length > 0) {
        console.error(
            "No se pudo inicializar el módulo de historial. Faltan elementos HTML:",
            elementosFaltantes,
        );
        return;
    }

    //* ========================================
    //* VALIDAR DISPONIBILIDAD DE BOOTSTRAP
    //* ========================================

    if (!window.bootstrap?.Modal) {
        console.error(
            "Bootstrap Modal no está disponible. Verifica la carga de bootstrap.bundle.min.js.",
        );
        mostrarMensaje(
            "No se pudo inicializar la ventana de detalles porque Bootstrap no está disponible.",
            "error",
        );
        return;
    }

    const modalDetalle = window.bootstrap.Modal.getOrCreateInstance(
        elementos.modal,
    );

    // Permite mantener visible la advertencia si el listado puede mostrarse,
    // pero no fue posible resolver los nombres de los clientes.
    let clientesNoDisponibles = false;

    //* ========================================
    //* CERRAR SESIÓN
    //* ========================================

    if (elementos.btnCerrarSesion) {
        elementos.btnCerrarSesion.addEventListener("click", () => {
            sessionStorage.removeItem("sesionActiva");
            window.location.replace("login.html");
        });
    }

    //* ========================================
    //* EVENTOS DE BÚSQUEDA Y FILTROS
    //* ========================================

    elementos.buscar.addEventListener("input", aplicarFiltrosVentas);
    elementos.fechaDesde.addEventListener("change", aplicarFiltrosVentas);
    elementos.fechaHasta.addEventListener("change", aplicarFiltrosVentas);
    elementos.filtroEstado.addEventListener("change", aplicarFiltrosVentas);
    elementos.orden.addEventListener("change", aplicarFiltrosVentas);

    elementos.btnLimpiarFiltros.addEventListener("click", () => {
        elementos.buscar.value = "";
        elementos.fechaDesde.value = "";
        elementos.fechaHasta.value = "";
        elementos.filtroEstado.value = "TODOS";
        elementos.orden.value = "RECIENTES";

        aplicarFiltrosVentas();
    });

    // Delegación de eventos: permite consultar cualquier fila que se renderice.
    elementos.tabla.addEventListener("click", (evento) => {
        const botonDetalle = evento.target.closest("[data-venta-id]");

        if (!botonDetalle || !elementos.tabla.contains(botonDetalle)) {
            return;
        }

        const ventaId = botonDetalle.dataset.ventaId;
        mostrarDetalleVenta(ventaId, modalDetalle);
    });

    //* ========================================
    //* CARGAR DATOS INICIALES
    //* ========================================

    cargarHistorial();

    //* ========================================
    //* CONSULTAR VENTAS Y CLIENTES
    //* ========================================

    async function cargarHistorial() {

        mostrarCarga();

        // Las ventas son indispensables. Los clientes se consultan en paralelo,
        // pero si su endpoint falla todavía se puede mostrar el ID del cliente.
        const [resultadoVentas, resultadoClientes] = await Promise.allSettled([
            consultarAPI(apiVentas),
            consultarAPI(apiClientes),
        ]);

        if (resultadoVentas.status === "rejected") {
            console.error(
                "No fue posible consultar las ventas:",
                resultadoVentas.reason,
            );

            mostrarMensaje(
                "No fue posible cargar las ventas. Verifica la conexión con MockAPI e intenta recargar la página.",
                "error",
            );

            mostrarFilaVacia("No se pudieron cargar las ventas.");
            return;
        }

        ventas = resultadoVentas.value;

        if (resultadoClientes.status === "fulfilled") {
            clientes = resultadoClientes.value;
            clientesNoDisponibles = false;
            construirIndiceClientes();
        } else {
            clientesNoDisponibles = true;
            clientes = [];
            clientesPorId = new Map();

            console.error(
                "No fue posible consultar los clientes:",
                resultadoClientes.reason,
            );

            mostrarMensaje(
                "Las ventas se cargaron, pero no fue posible consultar los clientes. Se mostrará el identificador del cliente.",
                "error",
            );
        }

        aplicarFiltrosVentas();

        if (resultadoClientes.status === "fulfilled" && ventas.length > 0) {
            const cantidad = ventas.length;
            mostrarMensaje(
                cantidad === 1
                    ? "Se cargó 1 venta desde MockAPI."
                    : `Se cargaron ${cantidad} ventas desde MockAPI.`,
                "success",
            );
        }

    }

    //* ========================================
    //* RELACIONAR CLIENTES CON VENTAS
    //* ========================================

    function construirIndiceClientes() {

        clientesPorId = new Map();

        clientes.forEach((cliente) => {
            const clienteId = cliente.cliente_id ?? cliente.id;

            if (clienteId !== undefined && clienteId !== null) {
                clientesPorId.set(String(clienteId), cliente);
            }
        });

    }

    function obtenerNombreCliente(venta) {

        const clienteId = venta.cliente_id;
        const cliente = clientesPorId.get(String(clienteId));

        if (cliente?.nombre_razon_social) {
            return cliente.nombre_razon_social;
        }

        if (clienteId !== undefined && clienteId !== null && clienteId !== "") {
            return `Cliente #${clienteId}`;
        }

        return "Consumidor final";

    }

    //* ========================================
    //* APLICAR FILTROS Y ORDENAMIENTO
    //* ========================================

    function aplicarFiltrosVentas() {

        // La búsqueda ignora tildes y diferencias entre mayúsculas/minúsculas.
        // Se conserva la "ñ" porque es una letra distinta de la "n" en español.
        const termino = normalizarTextoBusqueda(elementos.buscar.value.trim());

        const fechaDesde = convertirFechaFiltro(elementos.fechaDesde.value, false);
        const fechaHasta = convertirFechaFiltro(elementos.fechaHasta.value, true);

        if (
            fechaDesde !== null &&
            fechaHasta !== null &&
            fechaDesde > fechaHasta
        ) {
            mostrarMensaje(
                "La fecha inicial no puede ser posterior a la fecha final.",
                "error",
            );
            mostrarFilaVacia("Revisa el rango de fechas seleccionado.");
            return;
        }

        const estadoSeleccionado = elementos.filtroEstado.value;

        const ventasFiltradas = ventas.filter((venta) => {

            const ventaId = normalizarTextoBusqueda(obtenerIdVenta(venta));
            const nombreCliente = normalizarTextoBusqueda(obtenerNombreCliente(venta));

            const coincideBusqueda =
                ventaId.includes(termino) ||
                nombreCliente.includes(termino);

            const estadoVenta = String(venta.estado_venta ?? "")
                .toLocaleUpperCase("es-CO");

            const coincideEstado =
                estadoSeleccionado === "TODOS" ||
                estadoVenta === estadoSeleccionado;

            const fechaVenta = new Date(venta.fecha_venta).getTime();
            const fechaValida = Number.isFinite(fechaVenta);

            const coincideFechaDesde =
                fechaDesde === null || (fechaValida && fechaVenta >= fechaDesde);

            const coincideFechaHasta =
                fechaHasta === null || (fechaValida && fechaVenta <= fechaHasta);

            return (
                coincideBusqueda &&
                coincideEstado &&
                coincideFechaDesde &&
                coincideFechaHasta
            );

        });

        ventasFiltradas.sort((ventaA, ventaB) => {
            const fechaA = new Date(ventaA.fecha_venta).getTime();
            const fechaB = new Date(ventaB.fecha_venta).getTime();

            const tiempoA = Number.isFinite(fechaA) ? fechaA : 0;
            const tiempoB = Number.isFinite(fechaB) ? fechaB : 0;

            return elementos.orden.value === "ANTIGUAS"
                ? tiempoA - tiempoB
                : tiempoB - tiempoA;
        });

        mostrarTablaVentas(ventasFiltradas);

        // Mantener la advertencia de clientes si esa consulta falló.
        if (clientesNoDisponibles) {
            mostrarMensaje(
                "Las ventas se cargaron, pero no fue posible consultar los clientes. Se muestra su identificador.",
                "error",
            );
            return;
        }

        if (ventasFiltradas.length === 0) {
            mostrarMensaje(
                ventas.length === 0
                    ? "No hay ventas registradas."
                    : "No se encontraron ventas con los filtros seleccionados.",
                "",
            );
        } else {
            ocultarMensaje();
        }

    }

    function convertirFechaFiltro(valor, fechaFinal) {

        if (!valor) {
            return null;
        }

        const hora = fechaFinal ? "T23:59:59.999" : "T00:00:00.000";
        const fecha = new Date(`${valor}${hora}`).getTime();

        return Number.isFinite(fecha) ? fecha : null;

    }

    //* ========================================
    //* RENDERIZAR LA TABLA DE VENTAS
    //* ========================================

    function mostrarTablaVentas(ventasMostrar) {

        elementos.tabla.replaceChildren();

        if (ventasMostrar.length === 0) {
            mostrarFilaVacia(
                ventas.length === 0
                    ? "Todavía no hay ventas registradas."
                    : "No se encontraron ventas con los filtros seleccionados.",
            );
            return;
        }

        ventasMostrar.forEach((venta) => {

            const fila = document.createElement("tr");

            const idVenta = obtenerIdVenta(venta);
            const valores = [
                `#${idVenta}`,
                formatearFecha(venta.fecha_venta),
                obtenerNombreCliente(venta),
                formatearMoneda(venta.total_venta),
                formatearMetodoPago(venta.metodo_pago),
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

            etiquetaEstado.className = `sales-status-badge ${obtenerClaseEstado(estado)}`;
            etiquetaEstado.textContent = estado;
            celdaEstado.appendChild(etiquetaEstado);
            fila.appendChild(celdaEstado);

            const celdaAcciones = document.createElement("td");
            const botonDetalle = document.createElement("button");
            botonDetalle.type = "button";
            botonDetalle.className = "btn-ver-detalle";
            botonDetalle.textContent = "Ver detalle";
            botonDetalle.dataset.ventaId = String(idVenta);
            botonDetalle.setAttribute(
                "aria-label",
                `Consultar detalle de la venta ${idVenta}`,
            );

            celdaAcciones.appendChild(botonDetalle);
            fila.appendChild(celdaAcciones);

            elementos.tabla.appendChild(fila);

        });

    }

    function mostrarFilaVacia(mensaje) {

        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 7;
        celda.className = "empty-table";
        celda.textContent = mensaje;

        fila.appendChild(celda);
        elementos.tabla.replaceChildren(fila);

    }

    //* ========================================
    //* CONSULTAR DETALLE DE UNA VENTA
    //* ========================================

    async function mostrarDetalleVenta(ventaId, modal) {

        const venta = ventas.find(
            (registro) => String(obtenerIdVenta(registro)) === String(ventaId),
        );

        if (!venta) {
            console.error("No se encontró la venta solicitada:", ventaId);
            return;
        }

        elementos.identificadorDetalle.textContent = `Venta #${ventaId}`;
        elementos.fechaDetalle.textContent = formatearFecha(venta.fecha_venta);
        elementos.clienteDetalle.textContent = obtenerNombreCliente(venta);
        elementos.estadoDetalle.textContent = String(venta.estado_venta ?? "—");
        elementos.metodoPagoDetalle.textContent = formatearMetodoPago(venta.metodo_pago);

        elementos.subtotalDetalle.textContent = formatearMoneda(venta.subtotal);
        elementos.descuentoDetalle.textContent = formatearMoneda(venta.descuento_total);
        elementos.impuestoDetalle.textContent = formatearMoneda(venta.impuesto_total);
        elementos.totalDetalle.textContent = formatearMoneda(venta.total_venta);
        elementos.valorRecibidoDetalle.textContent = formatearMoneda(venta.valor_recibido);
        elementos.cambioDetalle.textContent = formatearMoneda(venta.cambio);

        mostrarFilaDetalles("Cargando productos de la venta...");
        modal.show();

        try {

            if (detallesVenta === null) {
                detallesVenta = await consultarAPI(apiDetallesVenta);
            }

            const detalles = detallesVenta.filter((detalle) =>
                String(detalle.venta_id) === String(ventaId),
            );

            mostrarTablaDetalles(detalles);

        } catch (error) {

            console.error(
                `No fue posible consultar los detalles de la venta ${ventaId}:`,
                error,
            );

            // Se conserva null para permitir reintentar la consulta al abrir otra vez.
            detallesVenta = null;
            mostrarFilaDetalles(
                "No fue posible cargar los productos. Cierra el detalle e inténtalo nuevamente.",
            );

        }

    }

    function mostrarTablaDetalles(detalles) {

        elementos.tablaDetalles.replaceChildren();

        if (detalles.length === 0) {
            mostrarFilaDetalles("Esta venta no tiene detalles registrados.");
            return;
        }

        detalles.forEach((detalle) => {

            const fila = document.createElement("tr");
            const valores = [
                detalle.descripcion_producto ?? "Producto sin descripción",
                formatearCantidad(detalle.cantidad),
                formatearMoneda(detalle.precio_unitario),
                formatearMoneda(detalle.subtotal),
            ];

            valores.forEach((valor) => {
                const celda = document.createElement("td");
                celda.textContent = valor;
                fila.appendChild(celda);
            });

            elementos.tablaDetalles.appendChild(fila);

        });

    }

    function mostrarFilaDetalles(mensaje) {

        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 4;
        celda.className = "empty-table";
        celda.textContent = mensaje;

        fila.appendChild(celda);
        elementos.tablaDetalles.replaceChildren(fila);

    }

    //* ========================================
    //* MENSAJES DE ESTADO
    //* ========================================

    function mostrarCarga() {
        mostrarMensaje("Cargando el historial de ventas...", "");
        mostrarFilaVacia("Consultando ventas en MockAPI...");
    }

    function mostrarMensaje(texto, tipo = "") {

        elementos.mensaje.textContent = texto;
        elementos.mensaje.classList.remove("is-error", "is-success");
        elementos.mensaje.hidden = texto === "";

        if (tipo === "error") {
            elementos.mensaje.classList.add("is-error");
        } else if (tipo === "success") {
            elementos.mensaje.classList.add("is-success");
        }

    }

    function ocultarMensaje() {
        elementos.mensaje.hidden = true;
        elementos.mensaje.textContent = "";
        elementos.mensaje.classList.remove("is-error", "is-success");
    }

}

//* ========================================
//* FUNCIONES AUXILIARES DE FORMATO
//* ========================================

//* ========================================
//* NORMALIZAR TEXTO PARA BÚSQUEDAS
//* ========================================

function normalizarTextoBusqueda(valor) {

    // NFD separa las letras de sus signos diacríticos y luego los elimina.
    // Así, por ejemplo, "José", "Jose" y "JOSÉ" se comparan igual.
    return String(valor ?? "")
        .toLocaleLowerCase("es-CO")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

}

function obtenerIdVenta(venta) {
    return venta.venta_id ?? venta.id ?? "—";
}

function obtenerClaseEstado(estado) {

    const clases = {
        CONFIRMADA: "sales-status-confirmada",
        BORRADOR: "sales-status-borrador",
        ANULADA: "sales-status-anulada",
    };

    return clases[estado] ?? "";

}

function formatearFecha(valor) {

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

function formatearMoneda(valor) {

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

function formatearCantidad(valor) {

    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return "—";
    }

    return new Intl.NumberFormat("es-CO", {
        maximumFractionDigits: 2,
    }).format(numero);

}

function formatearMetodoPago(valor) {

    if (!valor) {
        return "—";
    }

    const metodo = String(valor).toLocaleUpperCase("es-CO");

    const nombres = {
        EFECTIVO: "Efectivo",
        TARJETA: "Tarjeta",
        QR: "QR",
        TRANSFERENCIA: "Transferencia",
        OTRO: "Otro",
    };

    return nombres[metodo] ?? String(valor);

}
