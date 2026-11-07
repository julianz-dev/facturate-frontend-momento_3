import { gco_verificarSesion } from "./auth.js";

import { gco_consultarAPI, gco_apiClientes, gco_apiProductos } from "./api.js";

import {
    gco_mostrarCargaClientes,
    gco_mostrarCargaProductos,
    gco_mostrarClientes,
    gco_mostrarProductos,
    gco_actualizarIndicadores,
    gco_mostrarErrorClientes,
    gco_mostrarErrorProductos,
    gco_mostrarCarrito,
} from "./ui.js";

// ========================================
// VARIABLES DEL DASHBOARD
// ========================================

// Almacenar los productos disponibles
let gco_productosActivos = [];

// Almacenar los productos agregados al carrito
let gco_carrito = [];

console.log("[GCO-DASHBOARD ONLINE]");

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
    // AGREGAR PRODUCTOS AL CARRITO
    // ========================================

    const gco_listaProductos = document.querySelector("#listaProductos");

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
        const gco_clientes = await gco_consultarAPI(gco_apiClientes);

        // Obtener únicamente clientes activos
        const gco_clientesActivos = gco_clientes.filter(
            (gco_cliente) => gco_cliente.activo === true,
        );

        // Mostrar clientes en el selector
        gco_mostrarClientes(gco_clientesActivos);

        // Actualizar indicador de clientes
        gco_actualizarIndicadores(
            gco_clientesActivos.length,
            document.querySelector("#indicadorProductos").textContent,
        );

        console.log("Clientes cargados:", gco_clientesActivos.length);
    } catch (gco_error) {
        console.error("No se pudieron cargar los clientes:", gco_error.message);

        gco_mostrarErrorClientes();
    }
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
