import { verificarSesion } from "./auth.js";

import {
    consultarAPI,
    apiClientes,
    apiProductos,
} from "./api.js";

import {
    mostrarCargaClientes,
    mostrarCargaProductos,
    mostrarClientes,
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

            // Actualizar la representación del carrito.
            mostrarCarrito(carrito);

            console.log("Carrito actualizado:");
            console.table(carrito);

        });

    }


    //* ========================================
    //* INICIALIZAR REPRESENTACIÓN DEL CARRITO
    //* ========================================

    mostrarCarrito(carrito);

    //* ========================================
    //* INICIALIZAR DASHBOARD
    //* ========================================

    async function inicializarDashboard() {

        // Mostrar estados de carga en el selector y el catálogo.
        mostrarCargaClientes();
        mostrarCargaProductos();

        // Consultar clientes y productos de manera simultánea.
        await Promise.all([

            cargarClientesDashboard(),

            cargarProductosActivos(),

        ]);

    }

    //* ========================================
    //* CONSULTAR CLIENTES ACTIVOS PARA VENTAS
    //* ========================================

    async function cargarClientesDashboard() {

        try {

            // Consultar todos los clientes registrados en MockAPI.
            const clientesRegistrados = await consultarAPI(apiClientes);

            // Conservar únicamente los clientes activos para nuevas ventas.
            clientesActivos = clientesRegistrados.filter(
                (cliente) => cliente.activo === true,
            );

            // Recordar la selección actual, si el cliente sigue activo.
            const selectorCliente = document.querySelector("#selectorCliente");

            const clienteSeleccionado = selectorCliente?.value ?? "";

            // Mostrar únicamente clientes activos en el selector de venta.
            mostrarClientes(clientesActivos);

            // Restaurar la selección solo si el cliente continúa activo.
            const seleccionSigueActiva = clientesActivos.some(
                (cliente) =>
                    String(cliente.cliente_id ?? cliente.id) ===
                    String(clienteSeleccionado),
            );

            if (seleccionSigueActiva && selectorCliente) {

                selectorCliente.value = clienteSeleccionado;

            }

            // El indicador "Clientes registrados" cuenta activos e inactivos.
            totalClientesRegistrados = clientesRegistrados.length;

            refrescarIndicadoresDashboard();

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

            refrescarIndicadoresDashboard();

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

            ]);

        }

    });

}