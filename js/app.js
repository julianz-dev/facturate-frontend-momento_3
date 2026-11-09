import { gco_verificarSesion } from "./auth.js";

import {
    gco_consultarAPI,
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
    gco_mostrarCarrito,
} from "./ui.js";

// ========================================
// VARIABLES DEL DASHBOARD Y DE LA VENTA
// ========================================

// Clientes activos disponibles para nuevas ventas.
let gco_clientesActivos = [];

// Productos activos disponibles en el catálogo de ventas.
let gco_productosActivos = [];

// Productos incorporados al carrito de la venta actual.
let gco_carrito = [];

// Los indicadores permanecen pendientes hasta que cada API responda.
let gco_totalClientesActivos = null;
let gco_totalProductosActivos = null;

// Temporizador para ocultar el mensaje de producto agregado.
let gco_temporizadorMensajeProducto = null;

// ========================================
// VERIFICAR AUTORIZACIÓN DE ACCESO
// ========================================

const gco_accesoAutorizado = gco_verificarSesion();

if (gco_accesoAutorizado) {
    console.log("Sesión validada. Acceso autorizado al dashboard.");

    // ========================================
    // CERRAR SESIÓN
    // ========================================

    const gco_btnCerrarSesion = document.querySelector("#btnCerrarSesion");

    if (gco_btnCerrarSesion) {
        gco_btnCerrarSesion.addEventListener("click", () => {
            sessionStorage.removeItem("gco_sesionActiva");
            window.location.replace("login.html");
        });
    }

    // ========================================
    // ACTUALIZAR INDICADORES DEL DASHBOARD
    // ========================================

    function gco_refrescarIndicadoresDashboard() {
        const gco_clientesTexto = gco_totalClientesActivos === null
            ? "—"
            : gco_totalClientesActivos;

        const gco_productosTexto = gco_totalProductosActivos === null
            ? "—"
            : gco_totalProductosActivos;

        gco_actualizarIndicadores(
            gco_clientesTexto,
            gco_productosTexto,
        );
    }

    // ========================================
    // MOSTRAR Y OCULTAR CATÁLOGO DE PRODUCTOS
    // ========================================

    const gco_btnAlternarCatalogo = document.querySelector(
        "#btnAlternarCatalogo",
    );

    const gco_contenedorCatalogo = document.querySelector(
        "#contenedorCatalogoProductos",
    );

    if (gco_btnAlternarCatalogo && gco_contenedorCatalogo) {
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
    }

    // ========================================
    // BUSCADOR DEL CATÁLOGO DE PRODUCTOS
    // ========================================

    const gco_buscarProducto = document.querySelector("#buscarProducto");

    if (gco_buscarProducto) {
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

            gco_mostrarProductos(gco_productosFiltrados);
        });
    }

    // ========================================
    // AGREGAR PRODUCTOS AL CARRITO
    // ========================================

    const gco_listaProductos = document.querySelector("#listaProductos");
    const gco_mensajeProductoAgregado = document.querySelector(
        "#mensajeProductoAgregado",
    );

    function gco_mostrarMensajeProductoAgregado() {
        if (!gco_mensajeProductoAgregado) {
            return;
        }

        gco_mensajeProductoAgregado.textContent = "Producto agregado.";
        gco_mensajeProductoAgregado.hidden = false;

        if (gco_temporizadorMensajeProducto !== null) {
            clearTimeout(gco_temporizadorMensajeProducto);
        }

        gco_temporizadorMensajeProducto = setTimeout(() => {
            gco_mensajeProductoAgregado.hidden = true;
            gco_mensajeProductoAgregado.textContent = "";
            gco_temporizadorMensajeProducto = null;
        }, 2500);
    }

    if (gco_listaProductos) {
        gco_listaProductos.addEventListener("click", (gco_evento) => {
            const gco_botonAgregar = gco_evento.target.closest(
                '[data-accion="agregar-carrito"]',
            );

            if (
                !gco_botonAgregar ||
                !gco_listaProductos.contains(gco_botonAgregar)
            ) {
                return;
            }

            const gco_productoId = gco_botonAgregar.dataset.productoId;

            const gco_productoSeleccionado = gco_productosActivos.find(
                (gco_producto) =>
                    String(gco_producto.producto_id) === String(gco_productoId),
            );

            if (!gco_productoSeleccionado) {
                console.error("No se encontró el producto seleccionado.");
                return;
            }

            const gco_productoExistente = gco_carrito.find(
                (gco_producto) =>
                    String(gco_producto.producto_id) === String(gco_productoId),
            );

            if (gco_productoExistente) {
                gco_productoExistente.cantidad++;
            } else {
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

            gco_mostrarCarrito(gco_carrito);
            gco_mostrarMensajeProductoAgregado();
        });
    }

    // ========================================
    // ADMINISTRAR PRODUCTOS DEL CARRITO
    // ========================================

    const gco_listaCarrito = document.querySelector("#listaCarrito");

    if (gco_listaCarrito) {
        gco_listaCarrito.addEventListener("click", (gco_evento) => {
            const gco_botonControl = gco_evento.target.closest("[data-accion]");

            if (
                !gco_botonControl ||
                !gco_listaCarrito.contains(gco_botonControl)
            ) {
                return;
            }

            const gco_productoId = gco_botonControl.dataset.productoId;
            const gco_accion = gco_botonControl.dataset.accion;

            const gco_productoExistente = gco_carrito.find(
                (gco_producto) =>
                    String(gco_producto.producto_id) === String(gco_productoId),
            );

            if (!gco_productoExistente) {
                return;
            }

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
            } else {
                return;
            }

            gco_mostrarCarrito(gco_carrito);

            console.log("Carrito actualizado:");
            console.table(gco_carrito);
        });
    }

    // ========================================
    // INICIALIZAR REPRESENTACIÓN DEL CARRITO
    // ========================================

    gco_mostrarCarrito(gco_carrito);

    // ========================================
    // INICIALIZAR DASHBOARD
    // ========================================

    async function gco_inicializarDashboard() {
        // Mostrar estados de carga en el selector y el catálogo.
        gco_mostrarCargaClientes();
        gco_mostrarCargaProductos();

        // Consultar clientes y productos de manera simultánea.
        await Promise.all([
            gco_cargarClientesActivos(),
            gco_cargarProductosActivos(),
        ]);
    }

    // ========================================
    // CONSULTAR CLIENTES ACTIVOS PARA VENTAS
    // ========================================

    async function gco_cargarClientesActivos() {
        try {
            // Consultar los clientes registrados en MockAPI.
            const gco_clientes = await gco_consultarAPI(gco_apiClientes);

            // Conservar únicamente los clientes activos.
            gco_clientesActivos = gco_clientes.filter(
                (gco_cliente) => gco_cliente.activo === true,
            );

            // Mostrar los clientes activos en el selector de venta.
            gco_mostrarClientes(gco_clientesActivos);

            // Actualizar el indicador general de clientes.
            gco_totalClientesActivos = gco_clientesActivos.length;
            gco_refrescarIndicadoresDashboard();

            console.log(
                "Clientes activos disponibles para ventas:",
                gco_clientesActivos.length,
            );
        } catch (gco_error) {
            console.error(
                "No se pudieron cargar los clientes para ventas:",
                gco_error.message,
            );

            gco_mostrarErrorClientes();
        }
    }

    // ========================================
    // CONSULTAR PRODUCTOS ACTIVOS PARA VENTAS
    // ========================================

    async function gco_cargarProductosActivos() {
        try {
            // Consultar el catálogo de productos.
            const gco_productos = await gco_consultarAPI(gco_apiProductos);

            // Conservar únicamente los productos activos.
            gco_productosActivos = gco_productos.filter(
                (gco_producto) => gco_producto.activo === true,
            );

            // Mostrar productos activos en el catálogo de ventas.
            gco_mostrarProductos(gco_productosActivos);

            // Actualizar el indicador general de productos.
            gco_totalProductosActivos = gco_productosActivos.length;
            gco_refrescarIndicadoresDashboard();

            console.log(
                "Productos activos disponibles para ventas:",
                gco_productosActivos.length,
            );
        } catch (gco_error) {
            console.error(
                "No se pudieron cargar los productos para ventas:",
                gco_error.message,
            );

            gco_mostrarErrorProductos();
        }
    }

    // Ejecutar la carga inicial del Dashboard.
    gco_inicializarDashboard();
}
